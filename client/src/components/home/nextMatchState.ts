import type { TeamMatchInfo } from '../../types';
import type { NextMatchCardView } from '../../../../api/src/types/matchState.types';

export type NextMatchCard = NextMatchCardView;
export type CardTone = NextMatchCard['tone'];

/** Server-selected prompt; an optional local estimate only changes its displayed time. */
export function nextMatchCard(
  match: TeamMatchInfo,
  _now: number,
  estimate: number | null = null
): NextMatchCard {
  const card = match.nextCard;
  if (estimate !== null && (card.small.key === 'opponent' || card.small.key === 'forServer')) {
    return { ...card, big: { key: 'about', values: { minutes: estimate } } };
  }
  return card;
}
