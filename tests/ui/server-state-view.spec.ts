import { test, expect } from '@playwright/test';
import { ensureSignedIn, signInViaRequest } from '../helpers/auth';
import { setupTournament } from '../helpers/tournamentSetup';
import { findMatchByTeams } from '../helpers/matches';

test('admin UI renders the server state and actions even when legacy status disagrees', async ({
  page,
  request,
}) => {
  await ensureSignedIn(page);
  await signInViaRequest(request);
  const setup = await setupTournament(request, {
    teamCount: 2,
    serverCount: 0,
    prefix: 'server-view',
  });
  expect(setup).toBeTruthy();
  const match = await findMatchByTeams(request, setup!.teams[0].id, setup!.teams[1].id);
  let decision = false;
  await page.route(`**/api/game/cs2/matches/${match!.slug}/manage`, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.match.status = 'live';
    body.match.state = {
      ...body.match.state,
      lifecycle: decision ? 'awaiting_decision' : 'cancelled',
      activity: decision ? 'needs_decision' : 'cancelled',
      roomPhase: decision ? 'needsDecision' : 'cancelled',
      actions: decision ? ['decide', 'cancel'] : [],
      blockers: [],
    };
    await route.fulfill({ response, json: body });
  });
  await page.goto(`/manage/tournaments/${setup!.tournament.id}/matches/${match!.slug}`);
  await expect(page.getByTestId('manage-state')).toHaveAttribute('data-state', 'Cancelled');
  await expect(page.getByRole('button', { name: 'Cancel match', exact: true })).toHaveCount(0);
  decision = true;
  await page.reload();
  await expect(page.getByTestId('manage-state')).toHaveAttribute(
    'data-state',
    'Needs admin decision'
  );
  await expect(page.getByRole('button', { name: / wins$/ })).toHaveCount(2);
});
