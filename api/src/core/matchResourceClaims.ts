import { db } from '../config/database';
import type { DbMatchRow } from '../types/database.types';
import { matchStateFor } from './matchState';

/** Serialize competing resource/team claims across API processes, before any external call. */
export async function claimMatchResource(
  slug: string,
  resourceId: string
): Promise<DbMatchRow | null> {
  return db.withClient(async (client) => {
    await client.query('BEGIN');
    try {
      const initial = await db.queryOneAsync<DbMatchRow>('SELECT * FROM matches WHERE slug = ?', [
        slug,
      ]);
      if (!initial) {
        await client.query('ROLLBACK');
        return null;
      }
      const keys = [
        `resource:${resourceId}`,
        ...[initial.team1_id, initial.team2_id].filter(Boolean).map((id) => `team:${id}`),
      ].sort();
      for (const key of keys)
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
      const { rows } = await client.query<DbMatchRow>(
        'SELECT * FROM matches WHERE slug = $1 FOR UPDATE',
        [slug]
      );
      const match = rows.length > 0 ? rows[0] : null;
      if (
        !match ||
        match.server_id ||
        match.team1_id !== initial.team1_id ||
        match.team2_id !== initial.team2_id ||
        !(await matchStateFor(match)).actions.includes('allocate')
      ) {
        await client.query('ROLLBACK');
        return null;
      }
      const occupied = await client.query<{ id: number }>(
        `SELECT id FROM matches WHERE id != $1 AND server_id = $2 AND status IN ('ready', 'loaded', 'live') LIMIT 1`,
        [match.id, resourceId]
      );
      if (occupied.rows.length) {
        await client.query('ROLLBACK');
        return null;
      }
      const claimed = await client.query<DbMatchRow>(
        'UPDATE matches SET server_id = $1, state_version = state_version + 1 WHERE id = $2 RETURNING *',
        [resourceId, match.id]
      );
      await client.query('COMMIT');
      return claimed.rows.length > 0 ? claimed.rows[0] : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

/** A failed attempt cannot clear a later accepted or replacement assignment. */
export async function releaseResourceClaim(claim: DbMatchRow): Promise<void> {
  await db.runAsync(
    `UPDATE matches SET server_id = NULL, state_version = state_version + 1
     WHERE id = ? AND server_id = ? AND state_version = ? AND status = 'ready'`,
    [claim.id, claim.server_id, claim.state_version ?? 0]
  );
}
