import { test, expect } from '@playwright/test';
import { projectCs2Observation } from '../../api/src/integrations/cs2/matchObservation';
import type { LiveMatchRecord } from '../../api/src/integrations/cs2/fleet/state';
import type { FleetServerStatus } from '../../api/src/integrations/cs2/fleet/driver';
import { ServerStatus } from '../../api/src/integrations/cs2/services/serverStatusService';

const record: LiveMatchRecord = {
  matchSlug: 'm',
  epoch: 2,
  serverId: 'fleet-new',
  liveRev: 1,
  configRev: 1,
  state: {
    match_id: 'm',
    epoch: 2,
    config_rev: 1,
    live_rev: 1,
    phase: 'live',
    series: { num_maps: 3, current_map: 1, score: { team1: 0, team2: 0 }, maps: {} },
    teams: {
      team1: { name: 'A', side: 'ct', score: 0, score_ct: 0, score_t: 0, players: {} },
      team2: { name: 'B', side: 't', score: 0, score_ct: 0, score_t: 0, players: {} },
    },
  },
  mapStats: null,
  mapRounds: {},
  needsSnapshot: false,
  updatedAt: 100,
};
const server: FleetServerStatus = {
  fleetServerId: 'fleet-new',
  online: true,
  matchSlug: 'm',
  phase: 'live',
  status: null,
  availability: 'busy',
};

test('only the current server and assignment may describe play', () => {
  expect(projectCs2Observation('m', record, server, null).activity).toBe('live');
  for (const changed of [
    { ...record, serverId: 'fleet-old' },
    { ...record, needsSnapshot: true },
    { ...record, epoch: 3 },
  ])
    expect(projectCs2Observation('m', changed, server, null).activity).toBe('unknown');
  expect(projectCs2Observation('m', record, { ...server, phase: null }, null).activity).toBe(
    'unknown'
  );
  expect(
    projectCs2Observation('m', record, { ...server, matchSlug: 'another' }, null).activity
  ).toBe('unknown');
});

test('the module reports game disagreement and in-game pause explicitly', () => {
  const mismatch = { ...record, state: { ...record.state!, game: { warmup: true } } };
  expect(projectCs2Observation('m', mismatch, server, null).activity).toBe('inconsistent');
  const paused = {
    ...record,
    state: { ...record.state!, pause: { active: true, type: 'technical' as const } },
  };
  expect(projectCs2Observation('m', paused, server, null).activity).toBe('paused');
});

test('fleet gaps never fall back to a stale process-local score cache', () => {
  const cached = { status: 'live' as const, lastEventAt: 100_000 };
  expect(projectCs2Observation('m', null, server, cached)).toMatchObject({
    activity: 'unknown',
    observedAt: null,
  });
  expect(
    projectCs2Observation('m', null, { ...server, fleetServerId: null }, cached)
  ).toMatchObject({
    activity: 'live',
    observedAt: 100,
  });
});

test('an accepted legacy assignment stays joinable before live stats arrive', () => {
  expect(
    projectCs2Observation(
      'm',
      null,
      {
        ...server,
        fleetServerId: null,
        status: ServerStatus.LOADING,
      },
      null
    )
  ).toMatchObject({ activity: 'loading', online: true });
});
