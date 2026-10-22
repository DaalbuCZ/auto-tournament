import React from 'react';
import { Box, Checkbox, Typography, Chip, Tooltip } from '@mui/material';
import { RobotIcon } from '@phosphor-icons/react';
import { getBracketMatchLabel, getStatusColor, getRoundLabel } from '../../utils/matchUtils';
import { isManualMatch, isShuffleMatch } from '../../utils/matchFlags';
import type { Match } from '../../types';
import { TeamNameLink } from '../team/TeamNameLink';
import { useTranslation } from 'react-i18next';
import { tokens, fontMono } from '../../theme/tokens';
import { Row } from '../common/ui';

interface MatchCardProps {
  match: Match;
  matchNumber: number; // Global match number
  roundLabel?: string; // Optional custom round label
  variant?: 'live' | 'completed' | 'default'; // Visual variant
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
  queuePosition?: number | null; // Position in allocation queue (1 = first in queue)
  /**
   * The game's own line under a match that has not got a place to run yet
   * (CS2: "allocates in 1:20"). Only the module knows what its matches wait
   * for, so the card renders what it is handed, or nothing.
   */
  queueStatus?: React.ReactNode;
  /** A line under the teams (the match list's latest live event). */
  note?: React.ReactNode;
}

/**
 * One match as a `RowList` row (audit chunk 6): which match it is on the
 * left, the two teams with their scores in the middle, the chips on the
 * right. The winner is marked in bold with an accent score rather than a
 * solid orange box, which the drafts keep for the one key state.
 */

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  matchNumber,
  roundLabel,
  variant = 'default',
  onClick,
  selectable,
  selected,
  onToggleSelected,
  queuePosition,
  queueStatus,
  note,
}) => {
  const { t } = useTranslation();
  const edgeColor = match.state?.roomPhase === 'live' ? tokens.color.live : 'transparent';
  const shuffle = isShuffleMatch(match);
  const manual = isManualMatch(match);

  const getTeamName = (teamId: string | undefined, which: 'team1' | 'team2') => {
    const team = teamId === match.team1?.id ? match.team1 : match.team2;
    if (team) {
      return team.name;
    }
    // Fallback for manual/ad‑hoc matches where inline config contains team
    // names but the DB team IDs are null.
    const configTeam =
      which === 'team1'
        ? (match.config?.team1 as { name?: string } | undefined)
        : (match.config?.team2 as { name?: string } | undefined);
    if (configTeam?.name) {
      return configTeam.name;
    }
    if (match.state?.lifecycle === 'completed') return '—';
    return 'TBD';
  };

  const isWinnerVisual = (which: 'team1' | 'team2') => match.state?.winner === which;

  const getTeamTextColor = (which: 'team1' | 'team2') => {
    const team = which === 'team1' ? match.team1 : match.team2;
    if (team) return 'text.primary';
    return 'text.disabled';
  };

  const getTeamScoreDisplay = (team: 'team1' | 'team2'): number | undefined => {
    if (match.state?.lifecycle === 'planned') return undefined;
    return team === 'team1' ? match.team1SeriesScore : match.team2SeriesScore;
  };
  const mapScoreCaption = (team: 'team1' | 'team2'): number | undefined => {
    if (match.state?.lifecycle !== 'active') return undefined;
    return (team === 'team1' ? match.team1MapScore : match.team2MapScore) ?? undefined;
  };
  const scoreTooltip = t('matchInfo.scoreboard.mapsWon');

  const teamLine = (which: 'team1' | 'team2') => {
    const team = which === 'team1' ? match.team1 : match.team2;
    const won = isWinnerVisual(which);
    const score = getTeamScoreDisplay(which);
    const mapScore = mapScoreCaption(which);
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 1,
          minWidth: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <TeamNameLink
            teamId={team?.id}
            name={getTeamName(team?.id, which)}
            showTag={false}
            variant="body1"
            sx={{ color: getTeamTextColor(which), fontWeight: won ? 700 : 500 }}
            onClick={(e) => e.stopPropagation()}
          />
          {won && (
            <Typography
              component="span"
              variant="caption"
              sx={{ fontFamily: fontMono, color: tokens.color.accent }}
            >
              {t('matchesPage.card.winner')}
            </Typography>
          )}
        </Box>
        {score !== undefined && (
          <Tooltip title={scoreTooltip} placement="top">
            <Typography
              component="span"
              sx={{
                fontFamily: fontMono,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: won ? tokens.color.accent : 'text.primary',
                whiteSpace: 'nowrap',
              }}
            >
              {score}
              {mapScore !== undefined && (
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{ ml: 0.75, fontWeight: 500 }}
                >
                  ({mapScore})
                </Typography>
              )}
            </Typography>
          </Tooltip>
        )}
      </Box>
    );
  };

  return (
    <Row
      data-testid={`match-row-${match.slug}`}
      data-variant={variant}
      columns={{
        xs: selectable ? 'auto minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto',
        md: selectable
          ? 'auto minmax(9rem, 12rem) minmax(0, 1fr) auto'
          : 'minmax(9rem, 12rem) minmax(0, 1fr) auto',
      }}
      onClick={onClick}
      aria-selected={selectable ? Boolean(selected) : undefined}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        alignItems: 'start',
        boxShadow: `inset 3px 0 0 ${edgeColor}`,
        bgcolor: selected ? tokens.color.paper3 : 'transparent',
        '&:hover': onClick ? { bgcolor: tokens.color.paper3 } : {},
        '&:first-of-type': { borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit' },
        '&:last-of-type': { borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' },
      }}
    >
      {selectable && (
        <Checkbox
          size="small"
          checked={Boolean(selected)}
          onClick={(event) => event.stopPropagation()}
          onChange={() => (onToggleSelected ? onToggleSelected() : onClick?.())}
          slotProps={{
            input: { 'aria-label': t('matchesPage.card.matchNumber', { number: matchNumber }) },
          }}
          sx={{ m: -1 }}
        />
      )}
      {/* Which match */}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body1" fontWeight={700}>
          {getBracketMatchLabel(match) ??
            t('matchesPage.card.matchNumber', { number: matchNumber })}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {getBracketMatchLabel(match)
            ? t('matchesPage.card.matchNumber', { number: matchNumber })
            : roundLabel || getRoundLabel(match.round)}
        </Typography>
        {match.serverName && (
          <Typography variant="body2" color="text.secondary">
            {t('matchesPage.card.server', { name: match.serverName })}
          </Typography>
        )}
        {!match.serverId && queuePosition !== undefined && queuePosition !== null && (
          <Typography variant="body2" sx={{ color: tokens.color.accent, fontWeight: 600 }}>
            {t('matchesPage.card.queuePosition', { position: queuePosition })}
          </Typography>
        )}
        {!match.serverId && queueStatus}
      </Box>

      {/* The teams: under the match on a narrow screen, beside it above. */}
      <Box
        sx={{
          display: 'grid',
          gap: 0.5,
          minWidth: 0,
          order: { xs: 1, md: 0 },
          gridColumn: { xs: selectable ? '2 / -1' : '1 / -1', md: 'auto' },
        }}
      >
        {teamLine('team1')}
        {teamLine('team2')}
        {note}
      </Box>

      {/* Chips */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        {shuffle && (
          <Chip
            label={manual ? t('matchesPage.card.shuffleManual') : t('matchesPage.card.shuffle')}
            size="small"
            variant="outlined"
          />
        )}
        {!shuffle && manual && (
          <Chip label={t('matchesPage.card.manual')} size="small" variant="outlined" />
        )}
        {match.config?.simulation && (
          <Chip icon={<RobotIcon />} label={t('matchesPage.card.simulation')} size="small" />
        )}
        <Chip
          label={t(`matchState.${match.state?.activity ?? 'unknown'}`)}
          size="small"
          {...quietStatus(getStatusColor(match.state?.activity ?? 'unknown'))}
        />
      </Box>
    </Row>
  );
};

/**
 * The status chip, quiet: the brand orange marks text, not the chip's fill,
 * so the one solid accent on the page stays the page's own action.
 */
function quietStatus(color: ReturnType<typeof getStatusColor>) {
  return color === 'primary'
    ? { color: 'default' as const, sx: { color: tokens.color.accent } }
    : { color };
}
