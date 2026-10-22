import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { scopedSocket } from '../utils/sharedSocket';
import { onSocketReconnect } from '../utils/socketResync';

/** One side of the viewer's match: name, tag and logo. */
export interface MatchupSide {
  name: string | null;
  tag: string | null;
  logoUrl: string | null;
}

export type MatchStatusValue =
  | 'none'
  | 'your_turn_veto'
  | 'waiting_veto'
  | 'veto_soon'
  | 'waiting_server'
  | 'match_ready'
  | 'on_hold'
  | 'report_result'
  | 'needs_decision'
  | 'state_unknown';

interface MatchStatusResult {
  status: MatchStatusValue;
  matchSlug: string | null;
  /** "Team A vs Team B", when the match config names both teams. */
  matchName: string | null;
  label: string | null;
  /** Which side of the current match the viewer is on (veto phase only). */
  viewerTeam: 'team1' | 'team2' | null;
  /** Number of veto actions taken so far (veto phase only). */
  vetoActionCount: number | null;
  /** Team that made the most recent veto action (veto phase only). */
  lastVetoActionTeam: 'team1' | 'team2' | null;
  /** `veto_soon`: when the veto opens (ISO), after the break between matches. */
  opensAt: string | null;
  /** The tournament has no veto: `veto_soon` counts down to the match itself. */
  vetoOff: boolean;
  /** The viewer's team and the opponent, for the next-match dialog. */
  matchup: { you: MatchupSide; opponent: MatchupSide } | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

type MatchStatusSnapshot = Omit<MatchStatusResult, 'loading' | 'error' | 'refetch'>;
const EMPTY: MatchStatusSnapshot = {
  status: 'none',
  matchSlug: null,
  matchName: null,
  label: null,
  viewerTeam: null,
  vetoActionCount: null,
  lastVetoActionTeam: null,
  opensAt: null,
  vetoOff: false,
  matchup: null,
};

export function useCurrentMatchStatus(playerSteamId: string | null): MatchStatusResult {
  const [answer, setAnswer] = useState<{
    player: string;
    snapshot: MatchStatusSnapshot;
    error: string | null;
  } | null>(null);
  const request = useRef({ id: 0 });
  const fetchStatus = useCallback(async () => {
    if (!playerSteamId) return;
    const id = ++request.current.id;
    try {
      const res = await api.get<Partial<MatchStatusSnapshot> & { success: boolean }>(
        '/api/players/me/match-status'
      );
      if (id !== request.current.id) return;
      if (!res.success) throw new Error('Failed to read match status');
      setAnswer({ player: playerSteamId, snapshot: { ...EMPTY, ...res }, error: null });
    } catch (error) {
      if (id !== request.current.id) return;
      setAnswer((previous) => ({
        player: playerSteamId,
        snapshot:
          previous?.player === playerSteamId
            ? previous.snapshot
            : {
                ...EMPTY,
                status: 'state_unknown',
                label: 'state_unknown',
              },
        error: error instanceof Error ? error.message : 'Failed to read match status',
      }));
    }
  }, [playerSteamId]);

  useEffect(() => {
    if (!playerSteamId) return;
    const pending = request.current;
    void fetchStatus();
    const socket = scopedSocket();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        void fetchStatus();
      }, 50);
    };
    const subscribe = () => socket.emit('player:subscribe');
    subscribe();
    socket.on('connect', subscribe);
    const events = [
      'veto:update',
      'match:update',
      'bracket:update',
      'tournament:update',
      'mm:changed',
    ];
    for (const event of events) socket.on(event, refresh);
    const offReconnect = onSocketReconnect(socket, refresh);
    return () => {
      pending.id++;
      if (timer) clearTimeout(timer);
      offReconnect();
      for (const event of events) socket.off(event, refresh);
      socket.off('connect', subscribe);
      socket.close();
    };
  }, [playerSteamId, fetchStatus]);

  const current = answer?.player === playerSteamId ? answer : null;
  return {
    ...(current?.snapshot ?? EMPTY),
    loading: Boolean(playerSteamId && !current),
    error: current?.error ?? null,
    refetch: () => void fetchStatus(),
  };
}
