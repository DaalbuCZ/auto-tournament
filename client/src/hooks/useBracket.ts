import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { scopedSocket } from '../utils/sharedSocket';
import { onSocketReconnect } from '../utils/socketResync';
import type { Match, RoundRobinStanding, SwissStanding, Tournament } from '../types';
import { useSnackbar } from '../contexts/SnackbarContext';

export const useBracket = () => {
  const { showSuccess, showError } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [totalRounds, setTotalRounds] = useState(0);
  const [swissStandings, setSwissStandings] = useState<SwissStanding[]>([]);
  const [roundRobinStandings, setRoundRobinStandings] = useState<RoundRobinStanding[]>([]);
  const [starting, setStarting] = useState(false);
  const request = useRef({ id: 0 });

  /**
   * Load or reload the current bracket.
   *
   * When called with { silent: true }, this performs a background reload
   * without flipping the top-level `loading` flag. This avoids unmounting
   * the bracket page (and any open modals) on every websocket-driven
   * structural update while still keeping the data fresh.
   */
  const loadBracket = useCallback(async (options?: { silent?: boolean }) => {
    const id = ++request.current.id;
    const silent = options?.silent === true;
    if (!silent) {
      setLoading(true);
    }
    setError('');

    try {
      const response: {
        success: boolean;
        tournament?: Tournament;
        matches?: Match[];
        totalRounds?: number;
        swissStandings?: SwissStanding[];
        roundRobinStandings?: RoundRobinStanding[];
      } = await api.get('/api/tournament/bracket');
      if (id !== request.current.id) return;

      if (response.success && response.tournament) {
        setTournament(response.tournament);
        setMatches(response.matches ?? []);
        setTotalRounds(response.totalRounds || 0);
        setSwissStandings(response.swissStandings ?? []);
        setRoundRobinStandings(response.roundRobinStandings ?? []);
      } else {
        // No tournament yet - not an error, just empty state
        setTournament(null);
        setMatches([]);
        setTotalRounds(0);
        setSwissStandings([]);
        setRoundRobinStandings([]);
      }
    } catch (err) {
      if (id !== request.current.id) return;
      const error = err as Error;
      // Handle 404 gracefully - tournament doesn't exist yet (empty state)
      if (error.message.includes('404') || error.message.includes('No tournament')) {
        setTournament(null);
        setMatches([]);
        setTotalRounds(0);
        setSwissStandings([]);
        setRoundRobinStandings([]);
      } else {
        // Real error - network issue, server error, etc.
        setError(error.message || 'Failed to load bracket');
      }
    } finally {
      if (id === request.current.id) {
        setLoading(false);
      }
    }
  }, []);

  const startTournament = async () => {
    setStarting(true);

    try {
      const baseUrl = window.location.origin;
      const response: {
        success: boolean;
        message?: string;
        allocated?: number;
      } = await api.post('/api/tournament/start', { baseUrl });

      if (response.success) {
        // Backend now starts allocation in the background and returns immediately.
        // Show whatever message the API provides; allocation progress will be
        // reflected via bracket + match websocket updates.
        if (typeof response.allocated === 'number') {
          showSuccess(
            response.message ||
              `Tournament started! ${response.allocated} match${
                response.allocated === 1 ? '' : 'es'
              } allocated to servers.`
          );
        } else {
          showSuccess(
            response.message || 'Tournament start requested. Servers will be allocated shortly.'
          );
        }
        await loadBracket();
      } else {
        showError(response.message || 'Failed to start tournament');
      }
    } catch (err) {
      const error = err as Error;
      try {
        const parsed = JSON.parse(error.message || '') as {
          errorCode?: string;
          message?: string;
        };
        if (parsed?.errorCode === 'cs2_outdated_servers') {
          showError(
            parsed.message ||
              'One or more servers are out of date (or could not be verified). Update or disable affected servers and try again.'
          );
        } else {
          showError(error.message || 'Failed to start tournament');
        }
      } catch {
        showError(error.message || 'Failed to start tournament');
      }
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    const pending = request.current;
    void loadBracket();

    const newSocket = scopedSocket();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const reload = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        void loadBracket({ silent: true });
      }, 200);
    };
    const events = ['match:update', 'bracket:update', 'tournament:update', 'veto:update'];
    for (const event of events) newSocket.on(event, reload);
    const offReconnect = onSocketReconnect(newSocket, reload);
    return () => {
      pending.id++;
      if (timer) clearTimeout(timer);
      offReconnect();
      for (const event of events) newSocket.off(event, reload);
      newSocket.close();
    };
  }, [loadBracket]);

  return {
    loading,
    error,
    tournament,
    matches,
    totalRounds,
    swissStandings,
    roundRobinStandings,
    starting,
    loadBracket,
    startTournament,
  };
};
