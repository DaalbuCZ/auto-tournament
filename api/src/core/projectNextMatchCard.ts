import type { MatchStateView, NextMatchCardView } from '../types/matchState.types';

interface CardFacts {
  state: MatchStateView;
  viewerSide: 'team1' | 'team2';
  vetoTurn: 'team1' | 'team2' | null;
  vetoAction: string | null;
  viewerConnected: boolean;
  readyPlayers: number;
  expectedPlayers: number;
  /** Scores have already been oriented to the viewer by the team response. */
  score: [number, number];
  seriesScore: [number, number];
  map: string | null;
  round: number;
}

/** The player's prompt is selected by the server, along with the match activity. */
export function projectNextMatchCard(f: CardFacts): NextMatchCardView {
  const activity = f.state.activity;
  if (activity === 'waiting_opponent')
    return {
      tone: 'calm',
      big: { text: 'TBD' },
      small: { key: 'opponent' },
      label: 'nextMatch',
      action: 'open',
    };
  if (activity === 'veto') {
    const yours = f.vetoTurn === f.viewerSide;
    let what = 'veto';
    if (f.vetoAction === 'ban') what = 'ban';
    if (f.vetoAction === 'pick') what = 'pick';
    else if (f.vetoAction === 'side_pick') what = 'side';
    return {
      tone: 'act',
      big: { key: yours ? 'yourTurn' : 'veto' },
      small: { key: yours ? what : 'theirTurn' },
      label: yours ? 'vetoTurn' : 'nextMatch',
      action: 'veto',
    };
  }
  if ((activity === 'held' || activity === 'scheduled') && f.state.opensAt !== null)
    return {
      tone: 'act',
      big: { text: '' },
      small: {
        key: f.state.requiresPreMatch && !f.state.preMatchCompleted ? 'untilVeto' : 'untilMatch',
      },
      label: 'nextMatch',
      action: 'open',
      countdownTo: f.state.opensAt,
    };
  if (activity === 'queued')
    return {
      tone: 'wait',
      big: { key: 'waiting' },
      small: { key: 'forServer' },
      label: 'nextMatch',
      action: 'open',
    };
  if (activity === 'warmup' || activity === 'loading') {
    if (!f.viewerConnected && f.state.actions.includes('connect'))
      return {
        tone: 'act',
        big: { key: 'join' },
        small: { key: 'serverReady' },
        label: 'ready',
        action: 'join',
      };
    return {
      tone: 'live',
      big: { text: `${f.readyPlayers}/${f.expectedPlayers}` },
      small: { key: 'ready' },
      label: 'warmup',
      action: 'open',
    };
  }
  if (f.state.roomPhase === 'live') {
    const [a, b] = activity === 'between_maps' ? f.seriesScore : f.score;
    let small: NextMatchCardView['small'] = { key: 'round', values: { round: f.round } };
    if (activity === 'paused') small = { key: 'paused' };
    else if (activity === 'halftime') small = { key: 'halftime' };
    else if (activity === 'between_maps') small = { key: 'nextMap' };
    else if (f.map) small = { key: 'mapRound', values: { map: f.map, round: f.round } };
    return {
      tone: activity === 'paused' ? 'wait' : 'live',
      big: { text: `${a} – ${b}` },
      small,
      label: activity === 'paused' ? 'paused' : 'live',
      action: 'open',
    };
  }
  return {
    tone: 'calm',
    big: { key: `state.${activity}` },
    small: { key: 'openMatch' },
    label: 'nextMatch',
    action: 'open',
  };
}
