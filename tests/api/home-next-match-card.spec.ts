import { test, expect } from '@playwright/test';
import { projectNextMatchCard } from '../../api/src/core/projectNextMatchCard';
import { projectMatchState, type MatchStateFacts } from '../../api/src/core/projectMatchState';
import { nextMatchCard } from '../../client/src/components/home/nextMatchState';
import type { TeamMatchInfo } from '../../client/src/types';

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
const card = (
  facts: Partial<MatchStateFacts>,
  display: Partial<Parameters<typeof projectNextMatchCard>[0]> = {}
) =>
  projectNextMatchCard({
    state: projectMatchState({ ...base, ...facts }),
    viewerSide: 'team1',
    vetoTurn: 'team1',
    vetoAction: 'pick',
    viewerConnected: false,
    readyPlayers: 1,
    expectedPlayers: 4,
    score: [7, 5],
    seriesScore: [0, 1],
    map: 'Ancient',
    round: 13,
    ...display,
  });

test('the server chooses opponent, hold, veto turn and queue prompts', () => {
  expect(card({ participantsReady: false }).small.key).toBe('opponent');
  expect(card({ heldUntil: NOW + 120 })).toMatchObject({
    tone: 'act',
    countdownTo: NOW + 120,
    small: { key: 'untilVeto' },
  });
  expect(card({ heldUntil: NOW + 120, preMatchCompleted: true }).small.key).toBe('untilMatch');
  expect(card({})).toMatchObject({ tone: 'act', small: { key: 'pick' }, action: 'veto' });
  expect(card({}, { vetoTurn: 'team2' }).small.key).toBe('theirTurn');
  expect(card({ status: 'ready', preMatchCompleted: true }).small.key).toBe('forServer');
});

test('an unknown or offline server is never presented as ready to join', () => {
  expect(card({ status: 'loaded', assigned: true }).action).toBe('open');
  expect(
    card({
      status: 'loaded',
      assigned: true,
      observation: { activity: 'warmup', online: false, observedAt: NOW },
    }).action
  ).toBe('open');
});

test('observed play selects join, warmup, pause and between-map prompts', () => {
  const active = { status: 'live', assigned: true } as const;
  const phase = (activity: 'warmup' | 'live' | 'paused' | 'between_maps') => ({
    ...active,
    observation: { activity, online: true, observedAt: NOW },
  });
  expect(card(phase('warmup'))).toMatchObject({ action: 'join' });
  expect(card(phase('warmup'), { viewerConnected: true }).big).toEqual({ text: '1/4' });
  expect(card(phase('live')).big).toEqual({ text: '7 – 5' });
  expect(card(phase('paused'))).toMatchObject({ tone: 'wait', small: { key: 'paused' } });
  expect(card(phase('between_maps'))).toMatchObject({
    big: { text: '0 – 1' },
    small: { key: 'nextMap' },
  });
});

test('the UI uses the server prompt even when legacy fields contradict it', () => {
  const prompt = card({ heldUntil: NOW + 120 });
  const match = { status: 'live', heldUntil: null, nextCard: prompt } as TeamMatchInfo;
  expect(nextMatchCard(match, NOW)).toBe(prompt);
  const waiting = { ...match, nextCard: card({ participantsReady: false }) };
  expect(nextMatchCard(waiting, NOW, 12).big).toEqual({ key: 'about', values: { minutes: 12 } });
});
