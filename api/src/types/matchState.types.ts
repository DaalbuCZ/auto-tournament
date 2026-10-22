/** Server-owned match state. Clients render this contract; they do not reconstruct it. */
export type MatchStatus =
  'pending' | 'ready' | 'loaded' | 'live' | 'needs_decision' | 'completed' | 'cancelled';

export type MatchActivity =
  | 'not_started'
  | 'waiting_opponent'
  | 'waiting_team'
  | 'held'
  | 'scheduled'
  | 'veto'
  | 'queued'
  | 'loading'
  | 'warmup'
  | 'knife'
  | 'side_pick'
  | 'live'
  | 'halftime'
  | 'overtime'
  | 'paused'
  | 'between_maps'
  | 'reporting'
  | 'needs_decision'
  | 'completed'
  | 'cancelled'
  | 'offline'
  | 'inconsistent'
  | 'unknown';

export type MatchRoomPhase =
  | 'notStarted'
  | 'waitingOpponent'
  | 'veto'
  | 'joining'
  | 'live'
  | 'done'
  | 'blocked'
  | 'reporting'
  | 'needsDecision'
  | 'cancelled'
  | 'unknown';

export type MatchAction =
  | 'veto'
  | 'restart_veto'
  | 'connect'
  | 'allocate'
  | 'hold'
  | 'cancel'
  | 'decide'
  | 'edit_lineup'
  | 'force_ready'
  | 'start'
  | 'pause'
  | 'unpause'
  | 'change_map'
  | 'restore_round'
  | 'move'
  | 'correct_result';

export interface MatchBlocker {
  kind: 'tournament' | 'opponent' | 'hold' | 'tournament_paused' | 'schedule' | 'team_busy';
  until: number | null;
  reason: string | null;
}

/** Integration observations are separate from the durable series lifecycle. */
export interface MatchObservation {
  activity: MatchActivity;
  online: boolean | null;
  observedAt: number | null;
}

export interface MatchStateView {
  version: number;
  lifecycle: 'planned' | 'active' | 'awaiting_decision' | 'completed' | 'cancelled';
  activity: MatchActivity;
  roomPhase: MatchRoomPhase;
  blockers: MatchBlocker[];
  /** Structural affordances. Command endpoints still authorize the viewer and recheck facts. */
  actions: MatchAction[];
  observation: MatchObservation | null;
  requiresResource: boolean;
  requiresPreMatch: boolean;
  preMatchCompleted: boolean;
  participantsReady: boolean;
  opensAt: number | null;
  /** Canonical side, independent of map-score tiebreaks and viewer orientation. */
  winner: 'team1' | 'team2' | 'none' | null;
}

export interface NextMatchCardView {
  tone: 'act' | 'live' | 'wait' | 'calm';
  big: { key: string; values?: Record<string, string | number> } | { text: string };
  small: { key: string; values?: Record<string, string | number> };
  label: string;
  action: 'open' | 'veto' | 'join';
  countdownTo?: number;
}
