import { test, expect } from '@playwright/test';
import { db } from '../../api/src/config/database';
import { transitionMatch } from '../../api/src/core/matchTransitions';
import type { DbMatchRow } from '../../api/src/types/database.types';
import { resetDatabaseForGolden, getOk, postOk } from '../helpers/golden';
import { setupTournament } from '../helpers/tournamentSetup';
import { sendReadyUpEvents, goingLive, mapResult, seriesEnd } from '../helpers/readyUp';

test('a result has one writer, including draws; late events cannot revive cancellation', async ({
  request,
}) => {
  await resetDatabaseForGolden(request);
  expect(
    await setupTournament(request, {
      type: 'round_robin',
      teamCount: 4,
      serverCount: 0,
      prefix: 'transition',
    })
  ).toBeTruthy();
  const { matches } = await getOk<{ matches: DbMatchRow[] }>(request, '/api/matches');
  const [draw, cancelled, racing] = matches;
  for (const match of [draw, cancelled, racing])
    await postOk(request, '/api/test/match-state', { slug: match.slug, status: 'live' });
  const apply = (slug: string) =>
    postOk<{ applied: boolean; reason?: string }>(request, '/api/test/series-result', {
      slug,
      result: { games: [], team1Score: 0, team2Score: 0, winner: 'none' },
      meta: { source: 'integration', actorId: null },
    });
  expect((await apply(draw.slug)).applied).toBe(true);
  const before = await getOk(request, `/api/matches/${draw.slug}`);
  expect((await apply(draw.slug)).reason).toBe('already_completed');
  expect(await getOk(request, `/api/matches/${draw.slug}`)).toEqual(before);

  await postOk(request, `/api/matches/${cancelled.slug}/force-cancel`, {});
  await sendReadyUpEvents(request, cancelled.slug, [
    goingLive(1),
    mapResult({
      mapNumber: 1,
      mapName: 'de_mirage',
      team1: 13,
      team2: 0,
      series: [1, 0],
      winner: 'team1',
    }),
    seriesEnd({ winner: 'team1', team1: 1, team2: 0 }),
  ]);
  expect((await apply(cancelled.slug)).reason).toBe('invalid_state');
  const final = await getOk<{ match: { status: string } }>(
    request,
    `/api/matches/${cancelled.slug}`
  );
  expect(final.match.status).toBe('cancelled');

  const row = await db.queryOneAsync<DbMatchRow>('SELECT * FROM matches WHERE slug = ?', [
    racing.slug,
  ]);
  if (!row) throw new Error('Missing fixture');
  const results = await Promise.all([
    ...Array.from({ length: 25 }, (_, i) =>
      transitionMatch(row, i % 2 === 0 ? 'cancel' : 'complete', { winner_side: 'none' })
    ),
  ]);
  expect(results.filter(Boolean)).toHaveLength(1);
  const standalone = matches[3];
  await db.runAsync(
    "UPDATE matches SET round = 0, tournament_id = NULL, team1_id = NULL, team2_id = NULL, status = 'live' WHERE slug = ?",
    [standalone.slug]
  );
  expect(
    (
      await postOk<{ applied: boolean }>(request, '/api/test/series-result', {
        slug: standalone.slug,
        result: { games: [], team1Score: 0, team2Score: 1, winner: 'team2' },
        meta: { source: 'integration', actorId: null },
      })
    ).applied
  ).toBe(true);
  const saved = await db.queryOneAsync<DbMatchRow>('SELECT * FROM matches WHERE slug = ?', [
    standalone.slug,
  ]);
  expect(saved?.winner_side).toBe('team2');
  expect(saved?.winner_id).toBeNull();
});
