# Panel state redesign

Status: implemented read model and guarded transitions, 2026-10-22.
Review branches start at `codex/panel-state-contract`, based on current `origin/main`.

Implementation update: the implementation introduces a server-owned read model
(`api/src/core/projectMatchState.ts`, `matchState.ts`) and the shared wire contract
(`api/src/types/matchState.types.ts`). Match, bracket, team, connect, navbar and
admin views use it. CS2 supplies fenced observations; manual reporting supplies
its panel mode and permissions. React keeps server snapshots and interaction
state, rather than applying local match transitions or rehydrating a bracket
from localStorage. Socket events invalidate snapshots, with request ordering
guards on the main match, bracket and navbar reads.

Lifecycle writers now use explicit commands (`prepare`, `reset_prematch`,
`accept_assignment`, `resume_assignment`, `start_play`, `require_decision`,
`complete`, `cancel`, `retry_assignment`, `reopen`). The existing status strings
remain the storage compatibility representation. Commands compare the row version
and assignment before writing; PostgreSQL advisory locks serialize result/map
commands, cancellation and reopen across processes. A missed start notification
does not invalidate a verified result. Completed wins, draws and standalone
results are terminal; cancelled and undecided matches ignore late play events.
Reopen locks the match and downstream slots, and rolls back ratings, results,
slots and reports together if any prerequisite fails. Resource claims serialize
on the resource and both teams; cleanup is conditional on the exact claim version.
A stored `winner_side` preserves standalone winners without persistent team IDs.

This does not add event sourcing, a durable effects outbox, or result revision
history. Existing progression, stat and rating effects retain their recovery
limitations after a process crash. The larger design below records those as
separate follow-up architecture, rather than claiming this transition change
solves delivery guarantees. The function inventory is the audit's original source
snapshot, not current line numbers.

Scope: the whole tournament web/admin app and tournament/match lifecycle,
including CS2, manual reporting, standalone matches and matchmaking.
The design below records the full target; the implementation update above states
which part has landed in this branch.

## Recommendation

Replace the overloaded match status and competing UI phase classifiers with:

1. A small durable lifecycle owned by the core.
2. Explicit prerequisites and blockers, evaluated from current facts.
3. A resource assignment owned by the integration, distinct from what its server reports.
4. An integration observation, with freshness and ordering metadata.
5. A server-produced view containing the current activity and permitted actions.

Keep the current integration registry, format algorithms, report rules and fleet
protocol. No state-machine library, global frontend store, or event-sourcing rewrite
is needed. A typed decision function and transactional command handlers are sufficient.

## What exists today

There is no single inner state machine to delete. Its transitions are spread across
services, route handlers, integration adapters, timers and React rendering branches.

| Layer                 | Current representation                                                           | Writers / interpreters                                                   |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Tournament lifecycle  | `setup`, `ready`, `in_progress`, `completed`, `cancelled`                        | `tournamentService`, `scheduler`, format progression                     |
| Tournament controls   | `paused_at`, `resume_at`, `archived_at`, featured ID                             | holds, archive/current-tournament services                               |
| Signup and scheduling | settings, registrations, check-in records, timestamps                            | signup service, tournament schedule, match times                         |
| Match lifecycle       | `pending`, `ready`, `loaded`, `live`, `needs_decision`, `completed`, `cancelled` | generators, scheduler, veto, fleet driver, events, reports, admin routes |
| Prematch              | JSON `veto_state`, config flags, module readiness hooks                          | CS2 veto routes/timer/simulation, `makeMatchReady`                       |
| Scheduling controls   | `held_until`, reason, `countdown_from`, team occupancy, queue order              | holds, match times, allocation queue, moderation                         |
| Resource ownership    | `matches.server_id`, fleet assignments and epochs                                | CS2 allocation, driver, failover                                         |
| Observed game         | fleet snapshot/patch phase, pause, maps, presence, live stats cache              | fleet state store, normalizer, event adapter                             |
| Reporting             | submitted/disputed/confirmed/withdrawn/superseded report revisions               | manual-report service and sweeper                                        |
| Presentation          | match phase, navbar status, manage banner/counts, connect state                  | client utilities/hooks/pages plus API response builders                  |

`pending` can mean missing opponents, tournament not started, a future start time,
or unfinished veto. `ready` can still mean held, team busy, or queued.
`loaded` means an assignment was accepted; `live` is also used for resource-free
manual reporting. Neither tells the reader whether the current map is paused,
between maps, stale, or unavailable.

## Findings grounded in the code

These are static findings; no reproduction against a running tournament was performed.

| Finding                                                                        | Evidence                                                                                                                                           | Consequence / replacement requirement                                                                                   |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Status contracts disagree                                                      | `api/src/types/database.types.ts:16` omits loaded, cancelled and needs_decision; `match.types.ts` and `tournament.types.ts` have different unions  | One complete shared wire contract; no string casts to reach valid states                                                |
| Draw completion has a weaker duplicate guard                                   | `core/matchLifecycle.ts:480` only skips completed rows with a winner; `isMatchFinalized` also recognizes a completion timestamp                    | A committed result revision finalizes both wins and draws; no winner-ID proxy                                           |
| Completion and effects are not one recoverable operation                       | `processSeriesEnd` writes completed before release, progression, stats and ratings; `seriesEndInFlight` is process-local                           | Persist pending effects with the result; retry after interruption and across API processes                              |
| Completion is inferred differently across entry points                         | play-event handling uses `isMatchFinalized`; result application uses completed + winner                                                            | One terminal-state predicate and a distinct explicit correction command                                                 |
| Cancellation is not terminal in the play-event predicate                       | `shouldAcceptPlayEvent` returns true for every status except completed; `map.started` then writes live                                             | All semantic event entry points must honor cancellation and attempt fences; verify transport-level rejection separately |
| Allocation eligibility is distributed                                          | scheduler ready-row queries, `allocateSingleMatch`, `notHeldSql`, team-busy SQL, integration readiness                                             | One eligibility policy with SQL selection and final transactional recheck                                               |
| Allocation rollback can erase ownership without checking which attempt owns it | `Scheduler.allocateSingleMatch` catch clears `server_id` by slug                                                                                   | Conditional cleanup by assignment/attempt token; reconcile uncertain command outcomes                                   |
| UI phase classifiers have incomplete fallbacks                                 | `matchPhaseOf` ends at joining; ManageMatch's banner branches do not explicitly cover cancelled or needs_decision                                  | Exhaustive activity projection and explicit unknown/stale cases                                                         |
| Finished banner can disagree with the adjudicated winner                       | `ManageMatch` derives its winner from maps won, while the core supports tied-map tiebreak/admin decisions                                          | Display the committed result, including decision reason, separately from map scores                                     |
| Manage can retain an old tournament                                            | `useManageData` subscribes match/bracket refreshes only for matches; missing tournament responses do not clear the old value                       | Scope and invalidate tournament data explicitly; discard responses from older requests                                  |
| Navbar state can retain unrelated fields                                       | `useCurrentMatchStatus` clears only some fields on missing identity/error                                                                          | Store one response snapshot; separate request failure from no current match                                             |
| Recovery selection is tied to a CS2-shaped state                               | `recoverActiveMatches` selects loaded/live rows with a server                                                                                      | Recover pending commands/effects and integration observations independently                                             |
| A hold is doing several jobs                                                   | `holdForBreak`, `holdForStartTime`, manual holds and lineup gaps share scheduling controls; `holdOf` displays tournament pause ahead of match hold | Show all blockers and their origins; resolving one must not release another                                             |

The fleet store already provides useful epoch fencing, ordered revisions, gap
buffering and snapshot repair. The report service already enforces opponent
confirmation, report revisions, timeout policy, actor identity and restricted
reopening. Preserve these boundaries; they solve different problems.

## Proposed durable representation

Illustrative types, not an implementation or a new persistence format:

```ts
type MatchLifecycle =
  | { kind: 'planned' }
  | { kind: 'active'; activatedAt: number }
  | { kind: 'awaiting_decision'; reason: 'tied_series' | 'report_disputed' | 'report_timeout' }
  | { kind: 'completed'; resultRevision: number; completedAt: number }
  | { kind: 'cancelled'; cancelledAt: number; reason: string };

type MatchOrigin =
  | { kind: 'tournament'; tournamentId: number }
  | { kind: 'standalone' }
  | { kind: 'matchmaking'; lobbyId: string };

type Assignment =
  | { kind: 'none' }
  | { kind: 'assigning'; resourceId: string; attemptId: string; epoch: number }
  | { kind: 'assigned'; resourceId: string; attemptId: string; epoch: number }
  | { kind: 'releasing'; resourceId: string; attemptId: string; epoch: number };

type Blocker =
  | { kind: 'participants_missing' }
  | { kind: 'tournament_not_running' }
  | { kind: 'prematch_incomplete' }
  | { kind: 'scheduled'; opensAt: number }
  | { kind: 'match_hold'; id: string; until: number | null; reason: string | null }
  | { kind: 'tournament_paused'; until: number | null }
  | { kind: 'lineup_gap'; until: number | null }
  | { kind: 'team_busy'; matchSlug: string }
  | { kind: 'module_unavailable' };
```

The persisted match also has a monotonically increasing `version`, explicit
origin, participant slots, schedule, integration ID, and optional result.
Participants can be persistent teams or ad-hoc roster sides; do not require a
team database ID for standalone or matchmaking results. Bracket slots separately
record whether they are unresolved, filled, or an intentional bye.

`planned` covers prerequisites, veto and waiting for allocation. `active` begins
when the resource accepts the assignment, or when a resource-free integration
activates play. A map going live changes the observation, not the series lifecycle.
Moving servers changes assignment/epoch while preserving active play and results.
`awaiting_decision` stops progression but does not prevent report resolution.

The result records winner **side** or draw, series scores, source, actor, reason,
revision and game results. Winner team ID is a lookup for progression, never the
proof that a match finished. An explicit bye result can advance a bracket without
pretending a game was played or creating player ratings.

Store durable facts in the existing relational tables, with migrations and
constraints. The unions describe an API/domain shape, not a requirement to replace
tables with one JSON document. Keep counters and indexes needed by queue queries.

### Readiness and observations

Compute `blockers[]`, `canBeginPrematch`, and `canAllocate` from facts plus an
explicit `now`. Allocation additionally needs resource capacity, queue turn,
reservations, and an ownership claim. No-free-resources is a queue outcome, not
a reason to overwrite match lifecycle. Recheck blockers inside the claim path.

Keep separate gates for veto opening and match loading. A scheduled match may
veto before its start time. Tournament pause and manual hold block automation,
while an already live game may finish and publish a valid result. Specify whether
each blocker blocks prematch, allocation, auto-start or walkover independently;
do not treat every blocker as blocking every action.

Keep manual holds, scheduled times, round breaks and lineup gaps as independently
identifiable constraints. Removing a manual hold must leave a later schedule or
lineup restriction effective. Use null for indefinite duration, not a magic date.

An observation carries integration data plus `epoch`, revision, received time and
freshness (`fresh`, `stale`, `unknown`). CS2 owns warmup, knife, side selection,
live, halftime, overtime, in-game pause, intermission and postgame semantics.
Manual reporting owns its report workflow. Reports do not become CS2 phases.
Server disconnection marks observation health; it does not cancel the series.

### Tournament representation

Use durable `draft | running | completed | cancelled`. Derive readiness from
validation/preflight; retain `ready` as a compatibility projection during migration.
Registration/check-in windows, pause, archive, schedule and featured selection are
separate facts. Completion must be based on format-specific obligations and
committed results, including byes, draws and pending decisions.

Keep single/double elimination slot wiring, round-robin standings, Swiss pairing,
group qualification and shuffle round generation in their existing format owners.
They consume committed results; they do not allocate resources or invent match
status strings. Preserve old slug-based progression until old brackets are
converted and verified against explicit slot wiring.

## Commands, events and effects

Use explicit commands (`startTournament`, `completePrematch`, `activateMatch`,
`applyResult`, `cancelMatch`, `holdMatch`, `releaseHold`, `moveMatch`,
`correctResult`, `reopenMatch`), not a public arbitrary `setStatus` operation.
Handlers retain authorization, validation, audit actor and reason.

1. Load current facts and validate command, expected version and integration epoch.
2. In a database transaction, lock/recheck affected rows, write the new version,
   record the input identity, and persist required effects.
3. After commit, run effects with durable retry and a unique effect key.
4. Publish view invalidation after commit. External calls never run inside the
   database transaction. An acknowledgement or timeout is recorded separately.

Use an input key incorporating match attempt/epoch and event ID for integration
events; retain revision checks for state patches. Admin commands carry a request
ID and expected version; report commands retain their report revision.
Use result revision in effect keys for progression, ratings and stats. Retryable
effects must themselves be idempotent; an outbox alone cannot guarantee that.

Resource release must be tied to its assignment epoch, so a retry cannot release
the replacement server. Resource and team claims must serialize competing
allocations across processes, not just inside one JavaScript instance. Once play
ends, physical release can proceed, but a team's next match stays blocked until
the prerequisite result/progression work is committed. During uncertain assignment
outcomes, reconcile before offering that server to another match.

Corrections and reopening are new result revisions. Reopening must atomically
validate downstream matches and rating reversibility, supersede open/confirmed
reports, invalidate affected slots and stats, and fence old events. Map score
correction and series-winner correction need distinct semantics: a scoreboard typo
must not silently rewrite an adjudicated winner.

## One panel view, several scoped responses

Return a common `MatchStateView` in match list, bracket, team match, manage and
current-match responses. Build it from the same policy/projection functions:

```ts
interface MatchStateView {
  version: number;
  lifecycle: MatchLifecycle;
  activity: string; // closed shared union in implementation; module detail is separate
  blockers: Blocker[];
  observation: { freshness: 'fresh' | 'stale' | 'unknown'; receivedAt: number | null };
  actions: Array<{ id: string; enabled: boolean; reason?: string }>;
}
```

Activity covers waiting opponents, scheduled, held, prematch, queued, loading,
playing, reporting, decision required, completed, cancelled, and unknown. Modules
add typed detail (warmup/pause/etc.). Choose the primary activity in a tested
priority order; still return every blocker/health issue. A terminal result takes
precedence over an old offline-server observation. No missing observation becomes
an implicit warmup or joining state.

Actions are viewer-specific affordances. Endpoints re-authorize and recheck state;
frontend availability is not security. Core exposes generic actions and module
hooks supply CS2/report actions. Do not send admin commands, passwords or private
report data to public viewers. Share the pure projection, not a single oversized
admin response with every public page.

React owns only transient UI state: dialog, selection, draft input, request state.
Match labels/counts/cards read the server view. Fetch errors stay errors rather
than becoming “no match.” Reject out-of-order responses; reset snapshots on viewer
or tournament changes. Scoped socket invalidations trigger refetch; reconnect
also refetches. No unversioned partial socket patch may roll back a newer snapshot.
Keep existing polling fallbacks until equivalent recovery behavior is verified.

## Function audit and migration destinations

The companion [function inventory](panel-state-function-inventory.md) enumerates
named implementations and route callbacks in the lifecycle boundary files. It is
a navigation inventory, not a claim of individual correctness for every function
or an audit of unrelated authentication, skins, recorder or billing code.

| Function family                   | Functions / entry points inspected                                                                                        | Destination                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Initial state and serialization   | `determineInitialMatchStatus`, `requiresVeto`, `isMatchFinalized`, row-to-match/response helpers                          | Derive prerequisites via module capability; one contract and terminal predicate                    |
| Tournament CRUD and bracket setup | create/update/delete, generate/regenerate/reset/getBracket, initial slot status                                           | Preserve validation/config behavior; command handlers change lifecycle, generators emit slots/byes |
| Tournament control                | scheduler start/cancel/restart, checkStart/prepareStart, archive/featured/running selection                               | Explicit tournament commands, readiness projection, independent archive/feature facts              |
| Eligibility and queue             | ready-row selection, busy teams, queue turn, batch target, allocateSingle/Specific/Wave/Standalone                        | One eligibility policy plus atomic resource/team claims; retain queue order and reservations       |
| Timers and wakeups                | polling start/stop, immediate allocation, scheduleRoundAllocation, tickHolds, match-time and start-schedule ticks         | Existing triggers call the same commands; persisted deadlines survive restart                      |
| Holds and lineup gaps             | hold/release/break, pause/resume, restartCountdown, lineupPicked/resolveDueGaps                                           | Independent blockers and countdown resets; module hold side effects preserved                      |
| Result lifecycle                  | ingest, handleMapCompletion, finishExhaustedSeries, awaitAdminDecision, applySeriesResult, processSeriesEnd, admin winner | Single versioned result commit, explicit draw/decision paths, recoverable effects                  |
| Progression                       | winner/loser propagation, slot sources, makeMatchReady, legacy DE8 reconciliation, completion/placements                  | Consume results; format-specific generation remains; schedule allocation separately                |
| Dynamic formats                   | shuffle generation/bench/no-show/advance, Swiss advance, groups qualification/advance                                     | Preserve format rules and breaks; serialize generation and key it by round/result revision         |
| CS2 assignment                    | assign/unassign/update/sync, release/restart/reallocate/cancel, failover/restore                                          | Assignment records and fenced commands; lifecycle transition only through core API                 |
| CS2 observations                  | applySnapshot/applyPatch/rounds, applyNormalizedEvents, liveStatusForPhase, stale event guard                             | Keep epoch/revision store; send semantic events to core and module observation to projection       |
| Reports                           | submit/confirm/dispute/withdraw, admin resolve/override, reopen, sweepTimeouts                                            | Retain report state and authorization; finalize through versioned core result command              |
| Recovery                          | recoverActiveMatches, recoverMatch, replayRecentEvents                                                                    | Recover pending effects/assignments and refresh observations; replay with persistent deduplication |
| Matchmaking                       | formLobby/startMatch/accept/decline, rematch settlement, applyMatchResult, reservation rules                              | Lobby state remains separate; explicit match origin and versioned result effects                   |
| API read models                   | match list/detail, teamMatch, player match-status, CS2 manage/connect, public overview                                    | Shared projection; viewer-specific enrichment and redaction                                        |
| Panel presentation                | matchPhaseOf, match flags, manage counts/needs-you/recent events, ManageMatch banner, next-match state                    | Remove lifecycle inference; use activity, result and module details                                |
| Client data                       | useManageData/useTournament/useTeamMatchData/useCurrentMatchStatus/useLiveStats                                           | Scoped snapshots, request sequencing, reconnect invalidation; preserve local editor state          |
| Plugin boundaries                 | GameIntegration lifecycle/resource/readiness hooks, ClientGameIntegration slots                                           | Add semantic facts/actions incrementally; keep existing hooks via compatibility adapters           |

## Compatibility matrix

| Existing behavior                                      | Requirement on the new representation                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| CS2 veto on/off, BO1/3/5, simulation                   | Prematch completion is explicit; fixed maps bypass it; simulation uses the same commands              |
| Warmup/knife/side pick/live/pause/OT/between maps      | Module observation; postgame on one map never completes the series                                    |
| Server outage, failover, round backup restore          | Preserve active lifecycle; bump assignment epoch; discard old-server events                           |
| BO1 result without series end; exhausted series        | Preserve current finish/tiebreak policy and decision-required fallback                                |
| Manual reporting and custom stats                      | No resource required; opponent confirmation/revision/timeouts and stats validation remain             |
| Draws, forfeits, byes, admin rulings                   | Explicit result kind/source/reason; distinguish no play from played results                           |
| Standalone and matchmaking rosters                     | Winner side works without persistent team IDs; matchmaking rating path remains distinct               |
| SE/DE, RR, Swiss, groups, shuffle                      | Same slot/standings/pairing/bench rules; decisions block dependent advancement                        |
| Holds, tournament pause, schedule, breaks              | Independent constraints; active results still accepted; countdown reset preserved                     |
| Several tournaments and archived pages                 | Explicit scope in queries/events; archive remains read-only; no current-ID fallback in transitions    |
| Demos, highlights, GOTV, stats, ratings, notifications | Keep module payloads and result links; result effects retry safely; no duplicate public announcements |
| Existing REST/socket clients and packaged modules      | Additive views first; retain old fields/events with adapters until callers migrate                    |

## Migration sequence

1. **Contract and baseline:** unify current status types without renaming persisted
   values. Add regression cases for the findings above. Record existing API outputs
   and inventories of state writers, timers, hooks and consumers.
2. **Read projection:** add the shared state view beside existing fields, using
   existing facts. Compare projections across endpoints. Move panel consumers to
   it while retaining all backend transitions.
3. **Result ownership:** introduce versions, persistent input deduplication and
   result/effect transactions. Move admin/report/integration completions through
   the same owner; test interruption between every effect.
4. **Scheduling and resources:** centralize gates; add atomic claims and attempt
   tokens; migrate assignment/hold/recovery writers. Preserve fleet wire protocol.
5. **Durable lifecycle:** backfill new lifecycle/origin/result facts, compare old
   and new decisions, switch authoritative writes, retain legacy output mapping.
6. **Delete:** remove old phase inference, arbitrary status writes and obsolete
   timers only after every caller has migrated and compatibility checks pass.

Backfill is not a string substitution: completed without a winner may mean draw,
bye, ad-hoc victory or malformed legacy state. Inspect timestamp, games, source,
reports and bracket wiring. Unresolvable rows need an explicit repair record;
never invent a winner. Keep old data until rollback and reconciliation are tested.

## Acceptance checks before replacing runtime behavior

- Existing lifecycle/report/format/queue/manage tests retain their outcomes.
- Wins and draws applied twice, concurrently and after restart produce one result
  revision and one set of progression/stat/rating effects.
- Crash after completion but before release/progression resumes the missing work.
- Late map/series events, snapshots from a prior assignment and replayed events
  cannot resurrect cancelled/completed matches or undo a reopened attempt.
- Independent schedule, hold, pause and lineup constraints compose correctly;
  veto can open before match loading, and active results still finish during pause.
- Two matches cannot claim the same server or conflicting teams under concurrent
  allocators; uncertain assignment acknowledgements do not free busy resources.
- Every visible activity, including cancelled, needs decision, stale observation
  and resource-free reporting, has consistent labels and allowed actions across
  manage, match room, cards, brackets and navbar.
- Score corrections, tiebreak winners, draws and byes render from committed
  results; reopening respects downstream and rating constraints.
- Viewer/tournament switches and reversed response order cannot show another
  scope's match, commands, secrets or report permissions.
- API/package compatibility, database upgrade/backfill and rollback are exercised
  before legacy fields and hooks are removed.

Existing suites to extend rather than replace:

| Area                                             | Tests                                                                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Result semantics and duplicate inputs            | `tests/api/match-lifecycle.spec.ts`                                                                                                            |
| Queue fairness, capacity and team occupancy      | `tests/api/allocation-queue-order.spec.ts`, `batch-allocation-servers.spec.ts`, `team-busy-allocation.spec.ts`                                 |
| Ordered observations and assignment fencing      | `tests/api/fleet-state.spec.ts`, `live-state-new-match.spec.ts`                                                                                |
| Reports, permissions, reopening and custom stats | `tests/api/manual-report-reports.spec.ts`, `manual-report-routes.spec.ts`, `manual-report-admin-routes.spec.ts`, `manual-report-stats.spec.ts` |
| Scheduling and admin actions                     | `tests/api/tournament-schedule-units.spec.ts`, `manage-match-actions.spec.ts`, `manage-match.spec.ts`                                          |
| Format progression                               | `tests/api/swiss-progression.spec.ts` plus the existing format-specific suites discovered during each migration                                |
| Visible activity and controls                    | `tests/ui/manage-match-states.spec.ts`, `server-assigned-panel.spec.ts`, `manual-report-panel.spec.ts`, `manual-report-disputes.spec.ts`       |

Add focused pure-policy tests for blocker composition and exhaustive projection.
Use database/integration tests for concurrency and restart recovery; UI snapshots
cannot establish those guarantees. The existing UI specs cover selected states,
not the whole compatibility matrix.

Start with the read projection. It exposes inconsistencies without changing a
running tournament's behavior, and gives the later teardown a concrete contract.
