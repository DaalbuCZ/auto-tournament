import { getLiveState, type LiveMatchRecord } from './fleet/state';
import { fleetServerStatus, type FleetServerStatus } from './fleet/driver';
import { matchLiveStatsService, type MatchLiveStats } from '../../services/matchLiveStatsService';
import type { DbMatchRow } from '../../types/database.types';
import type { MatchActivity, MatchObservation } from '../../types/matchState.types';
import { serverStatusService, ServerStatus } from './services/serverStatusService';

const PHASE_ACTIVITY: Record<string, MatchActivity> = {
  loading: 'loading',
  restoring: 'loading',
  warmup: 'warmup',
  knife: 'knife',
  side_pick: 'side_pick',
  live: 'live',
  halftime: 'halftime',
  overtime: 'overtime',
  paused: 'paused',
  map_end: 'between_maps',
  series_end: 'between_maps',
  postgame: 'between_maps',
  error: 'unknown',
};

export async function cs2MatchObservation(match: DbMatchRow): Promise<MatchObservation | null> {
  if (!match.server_id) return null;
  const [record, server] = await Promise.all([
    getLiveState(match.slug),
    fleetServerStatus(match.server_id),
  ]);
  if (!server.fleetServerId) {
    const legacy = await serverStatusService.getServerStatus(match.server_id);
    server.online = legacy.online;
    // Acceptance confirms loading; an idle status alone never proves warmup.
    server.status =
      legacy.status === ServerStatus.IDLE && match.status === 'loaded'
        ? ServerStatus.LOADING
        : legacy.status;
  }
  const observation = projectCs2Observation(
    match.slug,
    record,
    server,
    matchLiveStatsService.getStats(match.slug)
  );
  if (!server.fleetServerId && server.online && server.status && observation.observedAt === null)
    observation.observedAt = Math.floor(Date.now() / 1000);
  return observation;
}

export function projectCs2Observation(
  slug: string,
  record: LiveMatchRecord | null,
  server: FleetServerStatus,
  live: Pick<MatchLiveStats, 'status' | 'lastEventAt'> | null
): MatchObservation {
  // Old assignments remain inspectable; they cannot describe the replacement server.
  const state =
    record?.state &&
    record.serverId === server.fleetServerId &&
    server.matchSlug === slug &&
    record.state.epoch === record.epoch &&
    server.phase !== null &&
    !record.needsSnapshot
      ? record.state
      : null;
  const phase = state?.phase ?? (server.fleetServerId ? null : (live?.status ?? server.status));
  let activity = phase ? (PHASE_ACTIVITY[phase] ?? 'unknown') : 'unknown';
  if (state?.pause?.active) activity = 'paused';
  const game = (state as { game?: { warmup?: boolean } } | null)?.game;
  if (game?.warmup && ['live', 'halftime', 'overtime'].includes(activity))
    activity = 'inconsistent';
  let observedAt: number | null = null;
  if (state) observedAt = record?.updatedAt ?? null;
  else if (live && !server.fleetServerId) observedAt = Math.floor(live.lastEventAt / 1000);
  return {
    activity,
    online: server.online,
    observedAt,
  };
}
