import { pageTitle } from '../utils/pageTitle';
import { manageMatchPath } from '../paths';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, LinearProgress, Snackbar, Alert, Button } from '@mui/material';
import { GameControllerIcon, PlusIcon } from '@phosphor-icons/react';
import { scopedSocket } from '../utils/sharedSocket';
import { onSocketReconnect } from '../utils/socketResync';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useSnackbar } from '../contexts/SnackbarContext';
import { EmptyState } from '../components/shared/EmptyState';
import { MatchesTable } from '../components/manage/MatchesTable';
import { useShellIntegrations, shellModule } from '../hooks/useShellIntegrations';
import { useResourceAvailability } from '../hooks/useResourceAvailability';
import { getGlobalMatchNumber } from '../utils/matchUtils';
import { isManualMatch as isManualMatchFlag } from '../utils/matchFlags';
import { api } from '../utils/api';
import type { Match, MatchEvent, MatchesResponse } from '../types';
import ConfirmDialog from '../components/modals/ConfirmDialog';
import { useTranslation } from 'react-i18next';
import { PageHead } from '../components/common/ui';

export default function Matches() {
  // One read of the tournament for both of this page's game-dependent parts:
  // the allocation status panel (CS2: servers the queue waits for) and what
  // the queued matches are waiting for (3.0 phase E). Both come from the
  // module the tournament runs; before there is a tournament, from every
  // installed module, because a standalone match can be created first.
  const {
    shell,
    tournament: tournamentIntegration,
    tournamentId,
    loading: tournamentIntegrationLoading,
  } = useShellIntegrations();
  // The tournament in the address (/manage/tournaments/:id/matches), else the one loaded.
  const { id: routeId } = useParams<{ id?: string }>();
  const scopeId = routeId && routeId !== 'new' ? Number(routeId) : (tournamentId ?? null);
  const ServerAllocationWidget = shellModule(shell, (i) => i.matchPanels.adminView)?.matchPanels
    .adminView;
  // The "create match" dialog is the module's whole form (client API 0.2.0):
  // the tournament's module, or before there is one the first installed
  // module that has one, because a standalone match can be created first. A
  // module with no standalone matches fills nothing, and the list offers none.
  const StandaloneMatchDialog = shellModule(shell, (i) => i.standaloneMatch)?.standaloneMatch;
  const navigate = useNavigate();
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  // `?match=<slug>` (an old shared link, paths.ts matchDetailsPath) opens the match room.
  const [searchParams] = useSearchParams();
  const linkedSlug = searchParams.get('match');
  const selectMatch = useCallback(
    (match: Match) => {
      if (match.slug) navigate(manageMatchPath(match.slug, scopeId));
    },
    [navigate, scopeId]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<Map<string, MatchEvent['event']>>(new Map());
  const [createMatchOpen, setCreateMatchOpen] = useState(false);
  const { showSuccess, showError } = useSnackbar();
  // What the queued matches are waiting for, asked of the game's own module
  // rather than of a route this page names (3.0 phase E). A module with no
  // resources is never asked, and every queue below then shows nothing, which
  // is the truth for a match that is simply open.
  const matchIntegration = tournamentIntegrationLoading
    ? null
    : (tournamentIntegration ?? shell[0] ?? null);
  const { availability: serverAllocationStatus, nextInSeconds: nextAllocationInSeconds } =
    useResourceAvailability(matchIntegration);
  // What the waiting matches are waiting for, said in the game's own words:
  // the pass countdown above the list, the same countdown in the toolbar, and
  // the per-match line on a card. A module with no resources fills none of
  // them and the list simply shows the matches.
  const QueueBanner = matchIntegration?.matchListQueue?.banner;
  const QueueCountdown = matchIntegration?.matchListQueue?.countdown;
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMatchSlugs, setSelectedMatchSlugs] = useState<Set<string>>(() => new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const { t } = useTranslation();

  const request = useRef({ id: 0 });

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    const id = ++request.current.id;
    try {
      const data = await api.get<MatchesResponse & { tournamentStatus?: string }>('/api/matches');
      if (id !== request.current.id) return;

      if (data.success) {
        const matches = data.matches || [];

        const upcoming = matches.filter(
          (m) =>
            (m.state?.lifecycle === 'planned' || m.state?.lifecycle === 'awaiting_decision') &&
            m.state.participantsReady
        );
        const live = matches.filter(
          (m) => m.state?.lifecycle === 'active' && m.state.participantsReady
        );
        const history = matches
          .filter((m) => m.state?.lifecycle === 'completed' || m.state?.lifecycle === 'cancelled')
          .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

        setUpcomingMatches(upcoming);
        setLiveMatches(live);
        setMatchHistory(history);
        // Clear any selections that no longer exist
        setSelectedMatchSlugs((prev) => {
          if (prev.size === 0) return prev;
          const existingSlugs = new Set(matches.map((m) => m.slug));
          const next = new Set<string>();
          prev.forEach((slug) => {
            if (existingSlugs.has(slug)) {
              next.add(slug);
            }
          });
          return next;
        });
      }
    } catch (err) {
      if (id !== request.current.id) return;
      setError(t('matchesPage.errors.loadMatches'));
      console.error(err);
    } finally {
      if (id === request.current.id) setLoading(false);
    }
  }, [t]);

  // Set dynamic page title
  useEffect(() => {
    document.title = pageTitle(t('layout.pageTitle.matches'));
  }, [t]);

  // Initialize Socket.io connection (mount-only)
  useEffect(() => {
    // Connect to same origin - works in both dev (proxied) and production (Caddy)
    const pending = request.current;
    const newSocket = scopedSocket();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const reload = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        void fetchMatches();
      }, 200);
    };
    newSocket.on('match:update', reload);
    newSocket.on('veto:update', reload);
    newSocket.on('tournament:update', reload);

    newSocket.on('match:event', (data: MatchEvent) => {
      setLiveEvents((prev) => {
        const updated = new Map(prev);
        updated.set(data.matchSlug, data.event);
        return updated;
      });
    });

    newSocket.on('bracket:update', reload);

    // Events sent while the socket was down are gone; refetch on reconnect.
    const offReconnect = onSocketReconnect(newSocket, () => void fetchMatches());

    return () => {
      pending.id++;
      if (timer) clearTimeout(timer);
      offReconnect();
      newSocket.disconnect();
    };
  }, [fetchMatches]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Get all matches for numbering context
  const allMatches = [...upcomingMatches, ...liveMatches, ...matchHistory];

  useEffect(() => {
    if (linkedSlug) navigate(manageMatchPath(linkedSlug, scopeId), { replace: true });
  }, [linkedSlug, navigate, scopeId]);

  const toggleMatchSelected = (match: Match) => {
    if (!isManualMatchFlag(match)) {
      // For safety, only allow bulk deletion of manual matches.
      return;
    }
    const slug = match.slug;
    if (!slug) return;
    setSelectedMatchSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const handleBulkDeleteMatches = async () => {
    if (selectedMatchSlugs.size === 0) return;
    try {
      const slugs = Array.from(selectedMatchSlugs);
      const count = slugs.length;
      await api.post('/api/matches/bulk-delete', { slugs });
      showSuccess(t('matchesPage.bulkDelete.deleted', { count }));
      setSelectedMatchSlugs(() => new Set());
      setSelectionMode(false);
      await fetchMatches();
    } catch (err) {
      console.error('Failed to delete matches', err);
      showError(t('matchesPage.errors.bulkDelete'));
    }
  };

  if (loading) {
    return (
      <>
        <PageHead title={t('layout.pageTitle.matches')} />
        <Box>
          <LinearProgress />
        </Box>
      </>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h6" color="error" gutterBottom>
          {t('matchesPage.errors.loadTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setError(null)} variant="filled">
            {error}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  const hasMatches =
    upcomingMatches.length > 0 || liveMatches.length > 0 || matchHistory.length > 0;

  return (
    <Box data-testid="matches-page" sx={{ width: '100%', height: '100%' }}>
      <PageHead
        title={t('layout.pageTitle.matches')}
        actions={
          hasMatches ? (
            <>
              <Button
                variant={selectionMode ? 'contained' : 'outlined'}
                color={selectionMode ? 'secondary' : 'inherit'}
                size="small"
                onClick={() => {
                  setSelectionMode((prev) => !prev);
                  if (selectionMode) {
                    setSelectedMatchSlugs(() => new Set());
                  }
                }}
              >
                {selectionMode
                  ? t('matchesPage.bulkSelect.done')
                  : t('matchesPage.bulkSelect.select')}
              </Button>
              {selectionMode && (
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  disabled={
                    [...upcomingMatches, ...liveMatches, ...matchHistory].filter((m) =>
                      isManualMatchFlag(m)
                    ).length === 0
                  }
                  onClick={() => {
                    const manualMatches = [
                      ...upcomingMatches,
                      ...liveMatches,
                      ...matchHistory,
                    ].filter((m) => isManualMatchFlag(m) && m.slug);
                    const allVisibleSelected =
                      manualMatches.length > 0 &&
                      manualMatches.every((m) => m.slug && selectedMatchSlugs.has(m.slug));

                    setSelectedMatchSlugs((prev) => {
                      const next = new Set(prev);
                      if (allVisibleSelected) {
                        manualMatches.forEach((m) => {
                          if (m.slug) next.delete(m.slug);
                        });
                      } else {
                        manualMatches.forEach((m) => {
                          if (m.slug) next.add(m.slug);
                        });
                      }
                      return next;
                    });
                  }}
                >
                  {(() => {
                    const manualMatches = [
                      ...upcomingMatches,
                      ...liveMatches,
                      ...matchHistory,
                    ].filter((m) => isManualMatchFlag(m) && m.slug);
                    const allVisibleSelected =
                      manualMatches.length > 0 &&
                      manualMatches.every((m) => m.slug && selectedMatchSlugs.has(m.slug));
                    return allVisibleSelected
                      ? t('matchesPage.bulkSelect.unselectAll')
                      : t('matchesPage.bulkSelect.selectAll');
                  })()}
                </Button>
              )}
              {selectionMode && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  disabled={selectedMatchSlugs.size === 0}
                  onClick={() => {
                    if (selectedMatchSlugs.size === 0) return;
                    setBulkDeleteConfirmOpen(true);
                  }}
                >
                  {t('matchesPage.bulkSelect.deleteSelected')}
                </Button>
              )}
              {!selectionMode && StandaloneMatchDialog && (
                <Button variant="contained" size="small" onClick={() => setCreateMatchOpen(true)}>
                  {t('matchesPage.header.createMatch')}
                </Button>
              )}
            </>
          ) : null
        }
      />
      {QueueBanner && (
        <QueueBanner
          availability={serverAllocationStatus}
          nextInSeconds={nextAllocationInSeconds}
        />
      )}
      {/* The allocation countdown, under the head */}
      {hasMatches && QueueCountdown && (
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <QueueCountdown
            availability={serverAllocationStatus}
            nextInSeconds={nextAllocationInSeconds}
          />
        </Box>
      )}

      {/* Server Allocation Status Widget */}
      {/* The module asks for its own resources, and shows nothing without any. */}
      {ServerAllocationWidget && hasMatches && (
        <ServerAllocationWidget tournamentId={tournamentId} />
      )}

      {!hasMatches && (
        <Box>
          <EmptyState
            data-testid="matches-empty-state"
            icon={GameControllerIcon}
            title={t('matchesPage.empty.title')}
            description={t('matchesPage.empty.description')}
            actionLabel={t('tournament.common.createTournament')}
            actionIcon={PlusIcon}
            onAction={() => navigate('/manage/tournament')}
          />
          {StandaloneMatchDialog && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Button variant="outlined" onClick={() => setCreateMatchOpen(true)}>
                {t('matchesPage.empty.createManual')}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {hasMatches && (
        <MatchesTable
          live={liveMatches}
          upcoming={upcomingMatches}
          history={matchHistory}
          numberOf={(match) => getGlobalMatchNumber(match, allMatches)}
          latestEvent={(match) => {
            const event = liveEvents.get(match.slug);
            return event?.event ? event.event.replace(/_/g, ' ') : null;
          }}
          onOpen={selectMatch}
          selection={
            selectionMode
              ? {
                  can: (match) => isManualMatchFlag(match),
                  has: (match) => selectedMatchSlugs.has(match.slug),
                  toggle: toggleMatchSelected,
                }
              : null
          }
        />
      )}

      {/* Create a standalone match: the module's dialog */}
      {StandaloneMatchDialog && (
        <StandaloneMatchDialog
          open={createMatchOpen}
          onClose={() => setCreateMatchOpen(false)}
          onCreated={async (slug) => {
            setCreateMatchOpen(false);
            showSuccess(t('matchesPage.create.success', { slug }));

            void fetchMatches();
          }}
        />
      )}

      <ConfirmDialog
        open={selectionMode && bulkDeleteConfirmOpen}
        title={t('matchesPage.bulkDelete.title')}
        message={t('matchesPage.bulkDelete.message', {
          count: selectedMatchSlugs.size,
        })}
        confirmColor="error"
        onConfirm={async () => {
          await handleBulkDeleteMatches();
          setBulkDeleteConfirmOpen(false);
        }}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />
    </Box>
  );
}
