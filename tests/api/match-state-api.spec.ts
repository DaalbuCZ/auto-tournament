import { test, expect } from '@playwright/test';
import { resetDatabaseForGolden, getOk, postOk } from '../helpers/golden';
import { setupTournament } from '../helpers/tournamentSetup';
import type { MatchStateView } from '../../api/src/types/matchState.types';

test('match, team, bracket, manage and connect responses share the server state', async ({
  request,
}) => {
  await resetDatabaseForGolden(request);
  const setup = await setupTournament(request, {
    format: 'bo3',
    teamCount: 2,
    serverCount: 0,
    prefix: 'state-view',
  });
  expect(setup).toBeTruthy();
  const { matches } = await getOk<{ matches: Array<{ slug: string; state: MatchStateView }> }>(
    request,
    '/api/matches'
  );
  const slug = matches[0].slug;
  const id = setup!.tournament.id;
  const readStates = async () => {
    const [detail, manage, bracket, connect] = await Promise.all([
      getOk<{ match: { state: MatchStateView } }>(request, `/api/matches/${slug}`),
      getOk<{ match: { state: MatchStateView } }>(request, `/api/game/cs2/matches/${slug}/manage`),
      getOk<{ matches: Array<{ slug: string; state: MatchStateView }> }>(
        request,
        `/api/tournament/${id}/bracket`
      ),
      getOk<{ state: MatchStateView }>(request, `/api/game/cs2/matches/${slug}/connect`),
    ]);
    return [
      detail.match!.state,
      manage.match!.state,
      bracket.matches!.find((match) => match.slug === slug)!.state,
      connect.state,
    ];
  };

  for (const state of await readStates()) expect(state.activity).toBe('veto');
  const team = await getOk<{ match: { state: MatchStateView; nextCard: { action: string } } }>(
    request,
    `/api/team/${setup!.teams[0].id}/match?match=${slug}`
  );
  expect(team.match.state.activity).toBe('veto');
  expect(team.match.nextCard.action).toBe('veto');

  await postOk(request, `/api/matches/${slug}/hold`, { reason: 'Admin note' });
  const [detail, manage, publicBracket] = await readStates();
  expect(detail.activity).toBe('held');
  expect(manage.activity).toBe('held');
  expect(publicBracket.activity).toBe('held');
  expect(manage.blockers.find((blocker) => blocker.kind === 'hold')?.reason).toBe('Admin note');
  expect(publicBracket.actions).toEqual([]);
  expect(publicBracket.blockers.every((blocker) => blocker.reason === null)).toBe(true);

  await postOk(request, '/api/test/match-state', { slug, status: 'cancelled' });
  for (const state of await readStates()) {
    expect(state.lifecycle).toBe('cancelled');
    expect(state.activity).toBe('cancelled');
    expect(state.actions).not.toContain('connect');
    expect(state.actions).not.toContain('veto');
  }
});
