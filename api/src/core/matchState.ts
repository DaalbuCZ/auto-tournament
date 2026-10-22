import { db } from '../config/database';
import { integrationForMatch } from '../integrations/registry';
import { describeMatch } from '../utils/matchIntegration';
import { matchTimeFields } from '../services/matchTimes';
import type { DbMatchRow, DbTournamentRow } from '../types/database.types';
import type { MatchStateView } from '../types/matchState.types';
import type { TournamentSettings } from '../types/tournament.types';
import { projectMatchState } from './projectMatchState';

/** Read the platform's facts once; every panel uses the same projection. */
export function createMatchStateReader(): (match: DbMatchRow) => Promise<MatchStateView> {
  const tournaments = new Map<number, Promise<DbTournamentRow | undefined>>();
  let busyMatches:
    Promise<Array<{ slug: string; team1_id: string | null; team2_id: string | null }>> | undefined;
  const now = Math.floor(Date.now() / 1000);
  return async (match) => {
    const integration = integrationForMatch(match);
    const description = describeMatch(match);
    if (match.tournament_id && !tournaments.has(match.tournament_id)) {
      tournaments.set(
        match.tournament_id,
        db.queryOneAsync<DbTournamentRow>('SELECT * FROM tournament WHERE id = ?', [
          match.tournament_id,
        ])
      );
    }
    const tournament = match.tournament_id ? await tournaments.get(match.tournament_id) : null;
    let settings: TournamentSettings | undefined;
    try {
      settings = JSON.parse(tournament?.settings ?? '{}') as TournamentSettings;
    } catch {
      settings = undefined;
    }
    let preMatchCompleted = false;
    try {
      preMatchCompleted = JSON.parse(match.veto_state ?? 'null')?.status === 'completed';
    } catch {
      /* An invalid stored veto is unfinished. */
    }
    const requiresPreMatch =
      integration.capabilities.veto &&
      !description.skipPreMatchPhase &&
      (tournament
        ? tournament.type !== 'shuffle' && (integration.usesPreMatchPhase?.({ settings }) ?? true)
        : description.skipPreMatchPhase === false);
    const terminal = match.status === 'completed' || match.status === 'cancelled';
    const active = match.status === 'loaded' || match.status === 'live';
    if (!terminal && !active && match.round > 0 && !busyMatches) {
      busyMatches = db.queryAsync<{
        slug: string;
        team1_id: string | null;
        team2_id: string | null;
      }>(
        `SELECT slug, team1_id, team2_id FROM matches WHERE
       status IN ('loaded', 'live') OR (status = 'ready' AND server_id IS NOT NULL AND server_id != '')`
      );
    }
    const busy = busyMatches ? await busyMatches : [];
    const teams = [match.team1_id, match.team2_id].filter(Boolean);
    const times = matchTimeFields(match, settings);
    let winner: MatchStateView['winner'] = match.winner_side ?? null;
    if (!winner && match.winner_id) winner = match.winner_id === match.team1_id ? 'team1' : 'team2';
    else if (!winner && match.status === 'completed' && match.round > 0) winner = 'none';
    return projectMatchState({
      status: match.status,
      version: match.state_version,
      participantsReady:
        match.round > 0
          ? Boolean(match.team1_id && match.team2_id && match.team1_id !== match.team2_id)
          : Boolean(
              description.team1.name &&
              description.team1.name !== 'TBD' &&
              description.team2.name &&
              description.team2.name !== 'TBD'
            ),
      tournamentStatus: tournament?.status ?? null,
      tournamentPaused: Boolean(tournament?.paused_at),
      resumeAt: tournament?.resume_at ?? null,
      heldUntil: match.held_until ?? null,
      holdReason: match.hold_reason ?? null,
      opensAt: requiresPreMatch && !preMatchCompleted ? times.vetoOpensAt : times.startsAt,
      teamBusy: busy.some(
        (row) =>
          row.slug !== match.slug &&
          [row.team1_id, row.team2_id].some((id) => id && teams.includes(id))
      ),
      requiresResource: integration.capabilities.servers,
      assigned: Boolean(match.server_id),
      requiresPreMatch,
      preMatchCompleted,
      observation:
        terminal || (!active && !match.server_id)
          ? null
          : ((await integration.matchObservation?.(match)) ?? null),
      winner,
      now,
    });
  };
}

export async function matchStateFor(match: DbMatchRow): Promise<MatchStateView> {
  return createMatchStateReader()(match);
}
