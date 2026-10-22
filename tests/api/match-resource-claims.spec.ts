import { test, expect } from '@playwright/test';
import { db } from '../../api/src/config/database';
import { transitionMatch } from '../../api/src/core/matchTransitions';
import { claimMatchResource, releaseResourceClaim } from '../../api/src/core/matchResourceClaims';
import type { DbMatchRow } from '../../api/src/types/database.types';
import { resetDatabaseForGolden, getOk, postOk } from '../helpers/golden';
import { setupTournament } from '../helpers/tournamentSetup';

test('resource and team claims serialize and stale cleanup cannot erase an accepted assignment', async ({
  request,
}) => {
  await resetDatabaseForGolden(request);
  const setup = await setupTournament(request, {
    teamCount: 4,
    serverCount: 2,
    prefix: 'claim',
    settings: { cs2: { veto: false } },
  });
  if (!setup) throw new Error('Missing tournament');
  const { matches } = await getOk<{ matches: Array<{ slug: string; round: number }> }>(
    request,
    '/api/matches'
  );
  const first = matches.find((match) => match.round === 1);
  if (!first) throw new Error('Missing match');
  await postOk(request, '/api/test/match-state', { slug: first.slug, status: 'ready' });
  const claims = await Promise.all(
    setup.servers.map((server) => claimMatchResource(first.slug, server.id))
  );
  const accepted = claims.filter((claim) => claim !== null);
  expect(accepted).toHaveLength(1);
  const claim = accepted[0];
  if (!claim) throw new Error('Missing claim');
  expect(await transitionMatch(claim, 'accept_assignment')).toBe(true);
  await releaseResourceClaim(claim);
  const row = await db.queryOneAsync<DbMatchRow>('SELECT * FROM matches WHERE slug = ?', [
    first.slug,
  ]);
  expect(row?.server_id).toBe(claim.server_id);
  expect(row?.status).toBe('loaded');
  const next = matches.find((match) => match.round === 1 && match.slug !== first.slug);
  const otherServer = setup.servers.find((server) => server.id !== claim.server_id);
  if (!next || !otherServer) throw new Error('Missing competing match');
  await db.runAsync(
    "UPDATE matches SET team1_id = ?, status = 'ready', server_id = NULL WHERE slug = ?",
    [claim.team1_id, next.slug]
  );
  expect(await claimMatchResource(next.slug, otherServer.id)).toBeNull();
});
