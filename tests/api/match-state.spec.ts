import { test, expect } from '@playwright/test';
import { projectMatchState, type MatchStateFacts } from '../../api/src/core/projectMatchState';

const NOW = 1_800_000_000;
const base: MatchStateFacts = {
  status: 'pending',
  participantsReady: true,
  tournamentStatus: 'in_progress',
  tournamentPaused: false,
  resumeAt: null,
  heldUntil: null,
  holdReason: null,
  opensAt: null,
  teamBusy: false,
  requiresResource: true,
  assigned: false,
  requiresPreMatch: true,
  preMatchCompleted: false,
  observation: null,
  winner: null,
  now: NOW,
};
const state = (facts: Partial<MatchStateFacts> = {}) => projectMatchState({ ...base, ...facts });

test('an unresolved opponent and an unstarted tournament never become a veto', () => {
  expect(state({ participantsReady: false }).activity).toBe('waiting_opponent');
  const before = state({ tournamentStatus: 'ready', participantsReady: false });
  expect(before.activity).toBe('not_started');
  expect(before.actions).not.toContain('veto');
  expect(before.blockers.map((b) => b.kind)).toEqual(['tournament', 'opponent']);
  expect(state().activity).toBe('veto');
  expect(state().actions).toContain('veto');
});

test('completed and cancelled are terminal even with a stale offline observation', () => {
  for (const status of ['completed', 'cancelled'] as const) {
    const result = state({
      status,
      assigned: true,
      tournamentPaused: true,
      observation: { activity: 'warmup', online: false, observedAt: NOW - 100 },
    });
    expect(result.lifecycle).toBe(status);
    expect(result.activity).toBe(status);
    expect(result.blockers).toEqual([]);
    expect(result.actions).not.toContain('connect');
    expect(result.actions).not.toContain('cancel');
    expect(result.actions).not.toContain('veto');
  }
});

test('draws and adjudicated winners are explicit; decisions do not resume play', () => {
  expect(state({ status: 'completed', winner: 'none' }).winner).toBe('none');
  expect(state({ status: 'completed', winner: 'team2' }).winner).toBe('team2');
  const decision = state({
    status: 'needs_decision',
    assigned: true,
    observation: { activity: 'live', online: false, observedAt: NOW },
  });
  expect(decision.activity).toBe('needs_decision');
  expect(decision.actions).toContain('decide');
  expect(decision.actions).not.toContain('connect');
});

test('independent hold, schedule and tournament pause survive partial release', () => {
  const held = state({ heldUntil: NOW + 60, opensAt: NOW + 120, tournamentPaused: true });
  expect(held.blockers.map((b) => b.kind)).toEqual(['tournament_paused', 'hold', 'schedule']);
  expect(held.opensAt).toBeNull();
  expect(held.actions).not.toContain('veto');
  expect(held.actions).not.toContain('allocate');
  expect(state({ opensAt: NOW + 120 }).activity).toBe('scheduled');
  expect(state({ heldUntil: NOW - 1, opensAt: NOW - 1 }).activity).toBe('veto');
  expect(state({ heldUntil: 2147483647 }).opensAt).toBeNull();
});

test('tournament pause blocks warmup automation without hiding active play', () => {
  const result = state({
    status: 'loaded',
    assigned: true,
    tournamentPaused: true,
    observation: { activity: 'warmup', online: true, observedAt: NOW },
  });
  expect(result.lifecycle).toBe('active');
  expect(result.activity).toBe('warmup');
  expect(result.actions).not.toContain('start');
  expect(result.actions).not.toContain('force_ready');
  expect(result.actions).toContain('connect');
});

test('resource-free matches report results without entering a server queue', () => {
  for (const status of ['ready', 'live'] as const) {
    const result = state({
      status,
      requiresResource: false,
      requiresPreMatch: false,
      tournamentStatus: null,
    });
    expect(result.activity).toBe('reporting');
    expect(result.roomPhase).toBe('reporting');
    expect(result.actions).not.toContain('connect');
    expect(result.actions).not.toContain('allocate');
  }
});

test('allocation separates a busy team from resource contention', () => {
  const ready = { status: 'ready', preMatchCompleted: true } as const;
  expect(state(ready).activity).toBe('queued');
  expect(state(ready).actions).toContain('allocate');
  expect(state({ ...ready, teamBusy: true }).activity).toBe('waiting_team');
  expect(state({ ...ready, teamBusy: true }).actions).not.toContain('allocate');
});

test('unknown, paused and between-map observations never complete a series', () => {
  const active = { status: 'live', assigned: true } as const;
  expect(state(active).activity).toBe('unknown');
  for (const activity of [
    'warmup',
    'knife',
    'side_pick',
    'live',
    'paused',
    'between_maps',
    'inconsistent',
  ] as const) {
    const result = state({ ...active, observation: { activity, online: true, observedAt: NOW } });
    expect(result.activity).toBe(activity);
    expect(result.lifecycle).toBe('active');
  }
  expect(
    state({ ...active, observation: { activity: 'live', online: false, observedAt: NOW } }).activity
  ).toBe('offline');
});
