import { onSocketReconnect } from '../utils/socketResync';
import { useCallback, useEffect, useState, useRef } from 'react';
import { scopedSocket } from '../utils/sharedSocket';
import { api } from '../utils/api';
import { useIntegrationFor } from '../integrations/registry';
import { useResourceAvailability } from './useResourceAvailability';
import type { ClientGameIntegration, ResourceAvailability } from '../integrations/types';
import type { Match } from '../types/match.types';
import type { Tournament } from '../types/tournament.types';
import type { MatchesResponse, TournamentResponse } from '../types/api.types';

export interface ManageData {
  loading: boolean;
  error: string | null;
  tournament: Tournament | null;
  matches: Match[];
  /** The module's own availability answer; null for a module with no queue. */
  availability: ResourceAvailability | null;
  refresh: () => void;
}

/**
 * Data for the Manage console. Reuses the exact endpoints and refresh
 * cadence the Matches and Dashboard pages already poll/subscribe to:
 * GET /api/matches (+ the same `match:update` / `bracket:update` sockets),
 * GET /api/tournament once, and — through the tournament's own game module,
 * on the same 5s cadence Matches.tsx uses — whatever that module's matches
 * wait for (3.0 phase E). The console used to name CS2's server-availability
 * route itself; a module with no resources is now simply never asked, and the
 * console's queue counts read zero and its resource rows stay empty.
 */
export function useManageData(
  /**
   * The module whose resources to count before there is a tournament (the
   * shell's, see `useShellIntegrations`): the console still shows the fleet
   * an admin is setting up for the tournament that does not exist yet.
   */
  resourceModuleWithoutTournament: ClientGameIntegration | null = null
): ManageData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const tournamentIntegration = useIntegrationFor(tournament);
  const [matches, setMatches] = useState<Match[]>([]);

  const requests = useRef({ matches: 0, tournament: 0 });

  const fetchMatches = useCallback(async () => {
    const id = ++requests.current.matches;
    try {
      const data = await api.get<MatchesResponse>('/api/matches');
      if (id !== requests.current.matches) return;
      if (data.success) {
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error('Failed to load matches for Manage:', err);
      setError((prev) => prev ?? 'Failed to load matches');
    }
  }, []);

  const fetchTournament = useCallback(async () => {
    const id = ++requests.current.tournament;
    try {
      const data = await api.get<TournamentResponse>('/api/tournament');
      if (id !== requests.current.tournament) return;
      setTournament(data.success ? (data.tournament ?? null) : null);
    } catch {
      // No tournament configured yet - not an error state for this page.
    }
  }, []);

  // Only the tournament's own module knows whether its matches wait for
  // anything, and where to ask, so a manually reported one never asks at
  // all. Before there is a tournament, the module the caller names.
  const { availability, refresh: refreshAvailability } = useResourceAvailability(
    tournament ? tournamentIntegration : resourceModuleWithoutTournament
  );

  const refresh = useCallback(() => {
    void fetchMatches();
    void refreshAvailability();
    void fetchTournament();
  }, [fetchMatches, refreshAvailability, fetchTournament]);

  useEffect(() => {
    let cancelled = false;
    const loadInitial = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([fetchMatches(), fetchTournament()]);
      if (!cancelled) setLoading(false);
    };
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [fetchMatches, fetchTournament]);

  // Same sockets Matches.tsx listens to, so the status strip and queue update
  // live without a second, independent realtime channel.
  useEffect(() => {
    const socket = scopedSocket();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reload = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        refresh();
      }, 100);
    };
    const events = ['match:update', 'bracket:update', 'tournament:update', 'veto:update'];
    for (const event of events) socket.on(event, reload);
    const offReconnect = onSocketReconnect(socket, reload);
    return () => {
      if (timer) clearTimeout(timer);
      offReconnect();
      for (const event of events) socket.off(event, reload);
      socket.disconnect();
    };
  }, [refresh]);

  return { loading, error, tournament, matches, availability, refresh };
}
