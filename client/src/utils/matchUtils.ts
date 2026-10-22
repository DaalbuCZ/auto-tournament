/**
 * Utility functions for match-related data formatting and calculations
 */

import i18n from '../i18n';
import { isGrandFinalSlug, isLosersBracketSlug } from './matchSlug';
import { fmtDateTime } from './time';

/**
 * Format a Unix timestamp to a localized date string
 */
export const formatDate = (timestamp: number): string => {
  return fmtDateTime(timestamp);
};

/**
 * Format a duration in seconds to HH:MM:SS or MM:SS format
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get the MUI color for a match status
 */
export const getStatusColor = (
  status: string,
  walkover: boolean = false
): 'error' | 'warning' | 'info' | 'success' | 'primary' | 'default' => {
  if (walkover) return 'warning';

  // Colours follow the homepage cards: live is green, finished is the solid
  // brand orange chip.
  switch (status) {
    case 'live':
      return 'success'; // Green - match is live
    case 'warmup':
    case 'loading':
    case 'loaded':
      return 'info'; // Blue - server loaded, waiting for players
    case 'veto':
    case 'held':
    case 'paused':
    case 'ready':
      return 'warning'; // Amber - ready to start
    case 'completed':
      return 'primary'; // Orange - match finished
    case 'offline':
    case 'inconsistent':
    case 'cancelled':
      return 'error'; // Red - match was cancelled
    case 'needs_decision':
      return 'warning'; // Maps are over, an admin has to set the winner
    default:
      return 'default'; // Gray - pending or unknown
  }
};

/**
 * Rounds in a single-elimination bracket of `teamCount` teams (8 → 3), the
 * count `getRoundLabel` needs to name the last rounds. Undefined for other
 * formats: their rounds have no stage names.
 */
export const eliminationRoundCount = (teamCount: number, type?: string): number | undefined =>
  type === 'single_elimination' && teamCount >= 2 ? Math.ceil(Math.log2(teamCount)) : undefined;

/**
 * Get a human-readable label for a tournament round
 * @param round The round number
 * @param totalRounds Optional total rounds for specific labels (Finals, Semi-Finals, etc.)
 */
export const getRoundLabel = (round: number, totalRounds?: number): string => {
  if (totalRounds) {
    if (round === totalRounds) return i18n.t('rounds.finals');
    if (round === totalRounds - 1) return i18n.t('rounds.semifinals');
    if (round === totalRounds - 2) return i18n.t('rounds.quarterfinals');
  }

  return i18n.t('rounds.roundN', { n: round });
};

type BracketMatchRef = {
  id: number;
  slug: string;
  round: number;
  matchNumber: number;
  bracket?: string | null;
};

/** 'WB' | 'LB' | 'GF' | 'GF_RESET' | 'SE' | null, falling back to the slug. */
export const getMatchBracket = (
  match: Pick<BracketMatchRef, 'slug' | 'bracket'>
): string | null => {
  if (match.bracket) return match.bracket;
  if (isGrandFinalSlug(match.slug)) return 'GF';
  if (isLosersBracketSlug(match.slug)) return 'LB';
  return null;
};

/** Chronological stage; mirrors queueStage in api/src/core/allocationQueue.ts. */
const matchStage = (match: BracketMatchRef): number => {
  if (match.round <= 0) return -1;
  const bracket = getMatchBracket(match);
  if (bracket === 'GF') return 100000;
  if (bracket === 'GF_RESET') return 100001;
  if (bracket === 'LB') return match.round + 1;
  return 2 * match.round - 1;
};

const bracketRank = (match: BracketMatchRef): number => {
  const bracket = getMatchBracket(match);
  return bracket === 'LB' ? 1 : bracket === 'GF' ? 2 : bracket === 'GF_RESET' ? 3 : 0;
};

/**
 * Display / queue order: stage, upper before lower bracket, round, match
 * number, id. Double elimination numbers upper and lower rounds separately and
 * the grand final is round 1 match 1, so plain round order numbered it #3.
 */
export const compareMatchOrder = (a: BracketMatchRef, b: BracketMatchRef): number =>
  matchStage(a) - matchStage(b) ||
  bracketRank(a) - bracketRank(b) ||
  a.round - b.round ||
  a.matchNumber - b.matchNumber ||
  a.id - b.id;

/** 1-based position of `match` among `all` in display order. */
export const getGlobalMatchNumber = (match: BracketMatchRef, all: BracketMatchRef[]): number =>
  [...all].sort(compareMatchOrder).findIndex((m) => m.id === match.id) + 1;

/**
 * Bracket-aware label for double-elimination matches: "UB R1 M1", "LB R2 M1",
 * "Grand Final". Null for every other match, which keeps "Match #n".
 */
export const getBracketMatchLabel = (
  match: Pick<BracketMatchRef, 'slug' | 'bracket' | 'round' | 'matchNumber'>
): string | null => {
  const bracket = getMatchBracket(match);
  const params = { round: match.round, match: match.matchNumber };
  switch (bracket) {
    case 'WB':
      return i18n.t('matchesPage.matchLabel.upper', params);
    case 'LB':
      return i18n.t('matchesPage.matchLabel.lower', params);
    case 'GF':
      return i18n.t('matchesPage.matchLabel.grandFinal');
    case 'GF_RESET':
      return i18n.t('matchesPage.matchLabel.grandFinalReset');
    // Groups, then playoffs: a group's match ("Group A · Round 2").
    case 'GA':
    case 'GB':
    case 'GC':
    case 'GD':
      return i18n.t('matchesPage.matchLabel.group', { group: bracket[1], round: match.round });
    default:
      return null;
  }
};
