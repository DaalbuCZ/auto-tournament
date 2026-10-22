import type {
  MatchAction,
  MatchActivity,
  MatchBlocker,
  MatchObservation,
  MatchRoomPhase,
  MatchStateView,
  MatchStatus,
} from '../types/matchState.types';

export interface MatchStateFacts {
  status: MatchStatus;
  version?: number;
  participantsReady: boolean;
  tournamentStatus: string | null;
  tournamentPaused: boolean;
  resumeAt: number | null;
  heldUntil: number | null;
  holdReason: string | null;
  opensAt: number | null;
  teamBusy: boolean;
  requiresResource: boolean;
  assigned: boolean;
  requiresPreMatch: boolean;
  preMatchCompleted: boolean;
  observation: MatchObservation | null;
  winner: MatchStateView['winner'];
  now: number;
}

const ROOM_PHASE: Record<MatchActivity, MatchRoomPhase> = {
  not_started: 'notStarted',
  waiting_opponent: 'waitingOpponent',
  waiting_team: 'blocked',
  veto: 'veto',
  queued: 'joining',
  loading: 'joining',
  warmup: 'joining',
  knife: 'live',
  side_pick: 'live',
  live: 'live',
  halftime: 'live',
  overtime: 'live',
  paused: 'live',
  between_maps: 'live',
  reporting: 'reporting',
  needs_decision: 'needsDecision',
  completed: 'done',
  cancelled: 'cancelled',
  held: 'blocked',
  scheduled: 'blocked',
  offline: 'blocked',
  inconsistent: 'blocked',
  unknown: 'unknown',
};

/** One priority policy for every API view. No clock, database, or UI dependencies. */
export function projectMatchState(f: MatchStateFacts): MatchStateView {
  const terminal = f.status === 'completed' || f.status === 'cancelled';
  const active = f.status === 'loaded' || f.status === 'live';
  const decision = f.status === 'needs_decision';
  const blockers: MatchBlocker[] = [];
  if (!terminal) {
    if (f.tournamentStatus !== null && f.tournamentStatus !== 'in_progress')
      blockers.push({ kind: 'tournament', until: null, reason: null });
    if (!f.participantsReady) blockers.push({ kind: 'opponent', until: null, reason: null });
    if (f.tournamentPaused)
      blockers.push({ kind: 'tournament_paused', until: f.resumeAt, reason: null });
    if (f.heldUntil !== null && f.heldUntil > f.now)
      blockers.push({
        kind: 'hold',
        until: f.heldUntil === 2147483647 ? null : f.heldUntil,
        reason: f.holdReason,
      });
    if (f.opensAt !== null && f.opensAt > f.now)
      blockers.push({ kind: 'schedule', until: f.opensAt, reason: null });
    if (f.teamBusy) blockers.push({ kind: 'team_busy', until: null, reason: null });
  }

  let activity: MatchActivity;
  if (terminal) activity = f.status === 'completed' ? 'completed' : 'cancelled';
  else if (decision) activity = 'needs_decision';
  else if (active || f.assigned) {
    if (!f.requiresResource) activity = 'reporting';
    else if (f.observation?.online === false) activity = 'offline';
    else activity = f.observation?.activity ?? 'unknown';
  } else if (blockers.some((b) => b.kind === 'tournament')) activity = 'not_started';
  else if (!f.participantsReady) activity = 'waiting_opponent';
  else if (blockers.some((b) => b.kind === 'hold' || b.kind === 'tournament_paused'))
    activity = 'held';
  else if (blockers.some((b) => b.kind === 'schedule')) activity = 'scheduled';
  else if (blockers.some((b) => b.kind === 'team_busy')) activity = 'waiting_team';
  else if (f.requiresPreMatch && !f.preMatchCompleted) activity = 'veto';
  else if (!f.requiresResource) activity = 'reporting';
  else activity = 'queued';

  const actions: MatchAction[] = [];
  if (!terminal) {
    actions.push('cancel');
    if (!decision) actions.push('edit_lineup');
    if ((!active && !decision) || f.status === 'loaded') actions.push('hold');
    if (decision || f.status === 'live') actions.push('decide');
    if (activity === 'veto') actions.push('veto');
    if (
      !active &&
      !decision &&
      !f.assigned &&
      f.requiresPreMatch &&
      f.participantsReady &&
      blockers.length === 0
    )
      actions.push('restart_veto');
    if (
      activity === 'queued' &&
      blockers.length === 0 &&
      f.status === 'ready' &&
      f.requiresResource
    )
      actions.push('allocate');
    if (f.assigned && f.requiresResource && !decision) {
      actions.push('connect', 'move');
      if (activity === 'warmup' && blockers.length === 0) actions.push('force_ready', 'start');
      if (activity === 'inconsistent') actions.push('start');
      if (activity === 'live' || activity === 'halftime' || activity === 'overtime')
        actions.push('pause');
      if (activity === 'paused') actions.push('unpause');
      if (['live', 'halftime', 'overtime', 'paused', 'warmup', 'between_maps'].includes(activity))
        actions.push('change_map', 'restore_round');
    }
  } else if (f.status === 'completed') actions.push('correct_result');

  let lifecycle: MatchStateView['lifecycle'] = 'planned';
  if (f.status === 'completed') lifecycle = 'completed';
  else if (f.status === 'cancelled') lifecycle = 'cancelled';
  else if (decision) lifecycle = 'awaiting_decision';
  else if (active || f.assigned) lifecycle = 'active';
  return {
    version: f.version ?? 0,
    lifecycle,
    activity,
    roomPhase: ROOM_PHASE[activity],
    blockers,
    actions,
    observation: f.observation,
    requiresResource: f.requiresResource,
    requiresPreMatch: f.requiresPreMatch,
    preMatchCompleted: f.preMatchCompleted,
    participantsReady: f.participantsReady,
    opensAt: blockers.some((b) => b.until === null)
      ? null
      : blockers.reduce<number | null>((at, b) => Math.max(at ?? 0, b.until ?? 0), null),
    winner: f.winner,
  };
}

export function visibleMatchState(
  state: MatchStateView,
  audience: 'public' | 'participant' | 'admin'
): MatchStateView {
  if (audience === 'admin') return state;
  return {
    ...state,
    actions:
      audience === 'participant'
        ? state.actions.filter(
            (action) => action === 'connect' || action === 'veto' || action === 'edit_lineup'
          )
        : [],
    blockers: state.blockers.map((blocker) => ({
      ...blocker,
      reason: audience === 'public' ? null : blocker.reason,
    })),
  };
}
