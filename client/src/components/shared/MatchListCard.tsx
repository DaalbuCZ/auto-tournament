import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { Row } from '../common/ui';
import { tokens } from '../../theme/tokens';
import { getBracketMatchLabel, getStatusColor } from '../../utils/matchUtils';
import { isManualMatch, isShuffleMatch, type MatchLike } from '../../utils/matchFlags';
import type { Match } from '../../types';
import { TeamNameLink } from '../team/TeamNameLink';
import { useTranslation } from 'react-i18next';

interface MatchListCardProps {
  match: Match;
  matchNumber: number;
  roundLabel?: string;
  onClick?: () => void;
  scoreDisplayMode?: 'auto' | 'series';
}

export const MatchListCard: React.FC<MatchListCardProps> = ({
  match,
  matchNumber,
  roundLabel: _roundLabel,
  onClick,
  scoreDisplayMode = 'auto',
}) => {
  const { t } = useTranslation();
  // eslint-disable-next-line no-restricted-syntax -- Match is an interface without MatchLike's index signature; same fields
  const matchLike = match as unknown as MatchLike;
  const shuffle = isShuffleMatch(matchLike);
  const manual = isManualMatch(matchLike);
  const winnerSide = match.state?.winner ?? null;
  const getTeamName = (teamId: string | undefined, which: 'team1' | 'team2') => {
    const team = teamId === match.team1?.id ? match.team1 : match.team2;
    if (team) {
      return team.name;
    }
    const configTeam =
      which === 'team1'
        ? (match.config?.team1 as { name?: string } | undefined)
        : (match.config?.team2 as { name?: string } | undefined);
    if (configTeam?.name) return configTeam.name;
    if (match.state?.lifecycle === 'completed') return '—';
    return 'TBD';
  };

  const getTeamScoreDisplay = (team: 'team1' | 'team2'): number | undefined => {
    if (scoreDisplayMode === 'series')
      return team === 'team1' ? match.team1SeriesScore : match.team2SeriesScore;
    return team === 'team1' ? match.team1Score : match.team2Score;
  };

  // In the bracket list view we want to emphasise the map number rather than
  // the round label, so always show "Map N" (defaulting to Map 1 when unknown).
  const metaLabel = t('matchesPage.card.mapN', {
    n: typeof match.mapNumber === 'number' ? match.mapNumber + 1 : 1,
  });

  const tooltipTitle =
    scoreDisplayMode === 'series' || match.state?.lifecycle === 'completed'
      ? t('matchInfo.scoreboard.mapsWon')
      : t('matchInfo.scoreboard.currentMapScore');
  const edgeColor = match.state?.roomPhase === 'live' ? tokens.color.live : 'transparent';

  return (
    // One row of a `RowList` (the drafts' `.row-list`), not a card of its own.
    <Row
      data-testid={`match-list-row-${match.slug}`}
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: `inset 3px 0 0 ${edgeColor}`,
        '&:hover': onClick ? { bgcolor: tokens.color.paper3 } : {},
        '&:first-of-type': { borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit' },
        '&:last-of-type': { borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' },
      }}
    >
      <Box
        position="relative"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        width="100%"
      >
        {/* Match meta */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" fontWeight={600} display="block">
            {getBracketMatchLabel(match) ?? `#${matchNumber}`} · {metaLabel}
          </Typography>
          {match.serverName && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {match.serverName}
            </Typography>
          )}
        </Box>

        <Box
          flex={1}
          minWidth={0}
          position="absolute"
          justifyContent="center"
          alignItems="center"
          display="flex"
          left={0}
          right={0}
          top={0}
          bottom={0}
        >
          <Box position="relative">
            <Typography
              variant="body2"
              fontWeight={winnerSide === 'team1' ? 600 : 500}
              noWrap
              position="absolute"
              right="120%"
              top={0}
              bottom={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              color={winnerSide === 'team1' ? 'success' : 'text.secondary'}
            >
              <TeamNameLink
                teamId={match.team1?.id}
                name={getTeamName(match.team1?.id, 'team1')}
                showTag={false}
                variant="body2"
                noWrap
                sx={{
                  color: winnerSide === 'team1' ? 'text.primary' : 'text.secondary',
                  fontWeight: winnerSide === 'team1' ? 600 : 500,
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </Typography>

            <Tooltip title={tooltipTitle} placement="top">
              <Typography variant="h6" fontWeight={700}>
                {getTeamScoreDisplay('team1') !== undefined &&
                  getTeamScoreDisplay('team2') !== undefined &&
                  `${getTeamScoreDisplay('team1')} - ${getTeamScoreDisplay('team2')}`}
              </Typography>
            </Tooltip>

            <Typography
              variant="body2"
              fontWeight={winnerSide === 'team2' ? 600 : 500}
              noWrap
              position="absolute"
              left="120%"
              top={0}
              bottom={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              color={winnerSide === 'team2' ? 'success' : 'text.secondary'}
            >
              <TeamNameLink
                teamId={match.team2?.id}
                name={getTeamName(match.team2?.id, 'team2')}
                showTag={false}
                variant="body2"
                noWrap
                sx={{
                  color: winnerSide === 'team2' ? 'text.primary' : 'text.secondary',
                  fontWeight: winnerSide === 'team2' ? 600 : 500,
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </Typography>
          </Box>
        </Box>

        {/* Status / badges */}
        <Box display="flex" alignItems="center" gap={0.5}>
          {shuffle && (
            <Chip
              label={manual ? t('matchesPage.card.shuffleManual') : t('matchesPage.card.shuffle')}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          )}
          {!shuffle && manual && (
            <Chip
              label={t('matchesPage.card.manual')}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          )}
          <Chip
            label={t(`matchState.${match.state?.activity ?? 'unknown'}`)}
            size="small"
            {...(getStatusColor(match.state?.activity ?? 'unknown') === 'primary'
              ? { sx: { color: tokens.color.accent } }
              : { color: getStatusColor(match.state?.activity ?? 'unknown') })}
          />
        </Box>
      </Box>
    </Row>
  );
};
