import { Alert, Box, Typography } from '@mui/material';
import { useModuleTranslation } from '../../../module-sdk';
import type { Recorder } from './highlightsAdminShared';
import { duration, Stat } from './highlightsAdminShared';

export function RecorderBenchmarkStat({ r }: { r: Recorder }) {
  const { t } = useModuleTranslation('cs2');
  let value = '—';
  if (r.progress?.step === 'benchmark') value = t('highlightsAdmin.benchmarkRunning');
  else if (r.benchmarkWanted) value = t('highlightsAdmin.benchmarkPending');
  else if (r.benchmark?.backend === 'native') {
    value = t(
      r.benchmark.ok ? 'highlightsAdmin.benchmarkNativeReady' : 'highlightsAdmin.benchmarkFailed'
    );
  } else if (r.gamescopeHz) value = t('highlightsAdmin.benchmarkPick', { hz: r.gamescopeHz });
  else if (r.benchmarkAt) value = t('highlightsAdmin.benchmarkNone');
  return <Stat label={t('highlightsAdmin.stat.benchmark')} value={value} />;
}

export function RecorderBenchmarkDetails({ r }: { r: Recorder }) {
  const { t } = useModuleTranslation('cs2');
  const benchmark = r.benchmark;
  if (!benchmark || r.benchmarkWanted || r.progress?.step === 'benchmark') return null;
  const native = benchmark.backend === 'native';
  return (
    <>
      {benchmark.error && (
        <Alert severity="error">{benchmark.error.split('--- gamescope log')[0].trim()}</Alert>
      )}
      {native && (
        <Typography variant="caption" color="text.secondary">
          {t('highlightsAdmin.benchmarkNativeHint')}
        </Typography>
      )}
      {benchmark.tries.length > 0 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              borderCollapse: 'collapse',
              fontSize: 13,
              '& td, & th': { px: 1, py: 0.25, textAlign: 'left', whiteSpace: 'nowrap' },
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <thead>
              <tr>
                <th>{t(native ? 'highlightsAdmin.bench.mode' : 'highlightsAdmin.bench.hz')}</th>
                <th>{t('highlightsAdmin.bench.time')}</th>
                <th>
                  {t(native ? 'highlightsAdmin.bench.exportFps' : 'highlightsAdmin.bench.fps')}
                </th>
              </tr>
            </thead>
            <tbody>
              {benchmark.tries.map((attempt) => (
                <tr key={attempt.gamescopeHz}>
                  <td>
                    {native ? t('highlightsAdmin.bench.native') : `${attempt.gamescopeHz} Hz`}
                    {attempt.ok && (native || attempt.gamescopeHz === benchmark.pick) ? ' ✓' : ''}
                  </td>
                  <td title={attempt.error}>
                    {attempt.ok ? duration(attempt.seconds) : t('highlightsAdmin.failed')}
                  </td>
                  <td>
                    {attempt.captureFps != null ? Number(attempt.captureFps.toFixed(1)) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </>
  );
}
