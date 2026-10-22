import { withMatchCommandLock } from './matchCommandLock';
import { db, type SqlValue } from '../config/database';
import type { DbMatchRow } from '../types/database.types';
import type { MatchStatus, MatchStateView } from '../types/matchState.types';
import { isMatchFinalized } from '../utils/matchStatusHelpers';

export type MatchCommand =
  | 'prepare'
  | 'reset_prematch'
  | 'resume_assignment'
  | 'accept_assignment'
  | 'start_play'
  | 'require_decision'
  | 'complete'
  | 'cancel'
  | 'retry_assignment'
  | 'reopen';

const TARGET: Record<MatchCommand, MatchStatus> = {
  prepare: 'ready',
  reset_prematch: 'pending',
  accept_assignment: 'loaded',
  resume_assignment: 'loaded',
  start_play: 'live',
  require_decision: 'needs_decision',
  complete: 'completed',
  cancel: 'cancelled',
  retry_assignment: 'ready',
  reopen: 'live',
};

/** Terminal rows only leave their state through an explicit reopen command. */
export function canTransitionMatch(
  match: Pick<DbMatchRow, 'status' | 'winner_id' | 'completed_at'>,
  command: MatchCommand
): boolean {
  if (command === 'reopen')
    return match.status === 'completed' || match.status === 'needs_decision';
  if (match.status === 'cancelled' || isMatchFinalized(match)) return false;
  switch (command) {
    case 'prepare':
    case 'reset_prematch':
      return match.status === 'pending' || match.status === 'ready';
    case 'accept_assignment':
      return match.status === 'ready';
    case 'resume_assignment':
      return match.status === 'loaded' || match.status === 'live';
    case 'retry_assignment':
      return match.status === 'ready' || match.status === 'loaded' || match.status === 'live';
    case 'start_play':
      // Fenced integration telemetry can arrive before the assignment acknowledgement.
      return (
        match.status === 'pending' ||
        match.status === 'ready' ||
        match.status === 'loaded' ||
        match.status === 'live' ||
        match.status === 'completed'
      );
    case 'require_decision':
    case 'complete':
      // A verified result can be the first event after a missed start notification.
      return true;
    case 'cancel':
      return true;
  }
}

interface TransitionFields {
  config?: string;
  veto_state?: string | null;
  server_id?: string | null;
  winner_id?: string | null;
  winner_side?: MatchStateView['winner'];
  loaded_at?: number | null;
  completed_at?: number | null;
  map_number?: number | null;
  current_map?: string | null;
  team1_id?: string | null;
  team2_id?: string | null;
}

/** Compare-and-set the row read by the command; a racing command must reread its facts. */
export async function transitionMatch(
  match: DbMatchRow,
  command: MatchCommand,
  fields: TransitionFields = {}
): Promise<boolean> {
  if (!canTransitionMatch(match, command)) return false;
  const values: Record<string, SqlValue> = {
    ...fields,
    status: command === 'resume_assignment' ? match.status : TARGET[command],
  };
  if (command === 'reopen') {
    values.winner_id = null;
    values.winner_side = null;
    values.completed_at = null;
  }
  if (command === 'complete' || command === 'cancel')
    values.completed_at = Math.floor(Date.now() / 1000);
  if (command === 'accept_assignment') values.loaded_at = Math.floor(Date.now() / 1000);
  const entries = Object.entries(values);
  return withMatchCommandLock(match.slug, async () => {
    const rows = await db.queryAsync<{ id: number }>(
      `UPDATE matches SET ${entries.map(([key]) => `${key} = ?`).join(', ')}, state_version = state_version + 1
     WHERE id = ? AND status = ? AND state_version = ? AND server_id IS NOT DISTINCT FROM ? RETURNING id`,
      [
        ...entries.map(([, value]) => value),
        match.id,
        match.status,
        match.state_version ?? 0,
        match.server_id ?? null,
      ]
    );
    return rows.length === 1;
  });
}
