import { useState, useCallback, useEffect, useRef } from 'react';
import { scopedSocket } from '../utils/sharedSocket';
import { onSocketReconnect } from '../utils/socketResync';
import type { Team, TeamStats, TeamStanding, TeamMatchInfo, TeamMatchHistory } from '../types';
interface UseTeamMatchDataReturn {
  team: Team | null;
  match: TeamMatchInfo | null;
  hasMatch: boolean;
  matchHistory: TeamMatchHistory[];
  stats: TeamStats | null;
  standing: TeamStanding | null;
  loading: boolean;
  updating: boolean; // Silent background updates
  error: string;
  tournamentStatus: string;
  setTournamentStatus: (status: string) => void;
  loadTeamMatch: (silent?: boolean) => Promise<void>;
  loadMatchHistory: () => Promise<void>;
  loadTeamStats: () => Promise<void>;
}

/**
 * A team's current match. With `matchSlug` (the match room), that match while the
 * team plays in it and it is open: a team in two tournaments at once has two.
 */
export function useTeamMatchData(
  teamId: string | undefined,
  matchSlug?: string
): UseTeamMatchDataReturn {
  const [team, setTeam] = useState<Team | null>(null);
  const [match, setMatch] = useState<TeamMatchInfo | null>(null);
  const [hasMatch, setHasMatch] = useState(false);
  const [loading, setLoading] = useState(true); // Only for initial load
  const [updating, setUpdating] = useState(false); // For background updates
  const [error, setError] = useState('');
  const [matchHistory, setMatchHistory] = useState<TeamMatchHistory[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [standing, setStanding] = useState<TeamStanding | null>(null);
  const [tournamentStatus, setTournamentStatus] = useState<string>('setup');

  const requests = useRef({ match: 0, history: 0, stats: 0 });

  const loadTeamMatch = useCallback(
    async (silent = false) => {
      if (!teamId) return;
      const requestId = ++requests.current.match;

      // Only show loading spinner on initial load, not on updates
      if (!silent) {
        setLoading(true);
      } else {
        setUpdating(true);
      }
      setError('');

      try {
        const query = matchSlug ? `?match=${encodeURIComponent(matchSlug)}` : '';
        const response = await fetch(`/api/team/${encodeURIComponent(teamId)}/match${query}`);
        if (requestId !== requests.current.match) return;

        // Handle 404 gracefully (team or no matches)
        if (response.status === 404) {
          const data = await response.json();
          if (requestId !== requests.current.match) return;
          // Team doesn't exist
          if (data.error === 'Team not found') {
            setError('Team not found. Please check the URL.');
          } else {
            // Team exists but no matches - this is handled by hasMatch flag
            setHasMatch(false);
            setMatch(null);
          }
          setLoading(false);
          setUpdating(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch team match');
        }

        const data = await response.json();
        if (requestId !== requests.current.match) return;

        if (data.success) {
          setTeam(data.team);
          setHasMatch(data.hasMatch);
          setTournamentStatus(data.tournamentStatus || 'setup');

          if (data.hasMatch && data.match) {
            setMatch(data.match);
          } else {
            setMatch(null);
          }
        }
      } catch (err) {
        if (requestId !== requests.current.match) return;
        console.error('Error loading team match:', err);
        if (!silent) {
          setError('Failed to load match information. Please try again.');
        }
      } finally {
        if (requestId === requests.current.match) {
          setLoading(false);
          setUpdating(false);
        }
      }
    },
    [teamId, matchSlug]
  );

  const loadMatchHistory = useCallback(
    async (silent = false) => {
      if (!teamId) return;
      const requestId = ++requests.current.history;

      if (!silent) setUpdating(true);

      try {
        const response = await fetch(`/api/team/${teamId}/history`);
        if (response.ok) {
          const data = await response.json();
          if (requestId !== requests.current.history) return;
          setMatchHistory(data.matches || []);
        }
      } catch (err) {
        console.error('Failed to load match history:', err);
      } finally {
        if (!silent && requestId === requests.current.history) setUpdating(false);
      }
    },
    [teamId]
  );

  const loadTeamStats = useCallback(
    async (silent = false) => {
      if (!teamId) return;
      const requestId = ++requests.current.stats;

      if (!silent) setUpdating(true);

      try {
        const response = await fetch(`/api/team/${teamId}/stats`);
        if (response.ok) {
          const data = await response.json();
          if (requestId !== requests.current.stats) return;
          setStats(data.stats);
          setStanding(data.standing);
        }
      } catch (err) {
        console.error('Failed to load team stats:', err);
      } finally {
        if (!silent && requestId === requests.current.stats) setUpdating(false);
      }
    },
    [teamId]
  );

  useEffect(() => {
    const pending = requests.current;
    setTeam(null);
    setMatch(null);
    setHasMatch(false);
    setMatchHistory([]);
    setStats(null);
    setStanding(null);
    setError('');
    if (!teamId) {
      setLoading(false);
      return;
    }
    void loadTeamMatch();
    void loadMatchHistory(true);
    void loadTeamStats(true);

    const socket = scopedSocket();
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Socket payloads invalidate snapshots; they never reconstruct domain state in React.
    const resync = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        void loadTeamMatch(true);
        void loadMatchHistory(true);
        void loadTeamStats(true);
      }, 250);
    };
    const events = ['match:update', 'bracket:update', 'tournament:update', 'veto:update'];
    for (const event of events) socket.on(event, resync);
    const offReconnect = onSocketReconnect(socket, resync);
    return () => {
      pending.match++;
      pending.history++;
      pending.stats++;
      if (timer) clearTimeout(timer);
      offReconnect();
      for (const event of events) socket.off(event, resync);
      socket.close();
    };
  }, [teamId, matchSlug, loadTeamMatch, loadMatchHistory, loadTeamStats]);

  return {
    team,
    match,
    hasMatch,
    matchHistory,
    stats,
    standing,
    loading,
    updating,
    error,
    tournamentStatus,
    setTournamentStatus,
    loadTeamMatch,
    loadMatchHistory,
    loadTeamStats,
  };
}
