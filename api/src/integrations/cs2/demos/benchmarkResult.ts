import type { Untrusted } from '../../../utils/untrusted';

export interface BenchmarkTry {
  gamescopeHz: number;
  seconds: number | null;
  captureFps: number | null;
  ok: boolean;
  error?: string;
}

export interface StoredBenchmark {
  tries: BenchmarkTry[];
  pick: number | null;
  source: 'bundled' | 'match';
  backend?: 'native' | 'stream';
  ok?: boolean;
  error?: string | null;
}

export interface BenchmarkResult extends StoredBenchmark {
  backend: 'native' | 'stream';
  ok: boolean;
  error: string | null;
}

function object(value: Untrusted): Record<string, Untrusted> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, Untrusted>;
}

function number(value: Untrusted): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

const errorText = (value: string) =>
  value.split('\n--- gamescope log, last lines ---')[0].slice(0, 300);

/** Check the recorder's message once; native export can finish below playback speed. */
export function benchmarkResult(input: Untrusted): BenchmarkResult {
  const body = object(input);
  const backend = body.backend === 'native' ? 'native' : 'stream';
  const tries: BenchmarkTry[] = [];
  for (const value of (Array.isArray(body.tries) ? body.tries : []).slice(0, 8)) {
    const attempt = object(value);
    const seconds = number(attempt.seconds);
    const gamescopeHz = backend === 'native' ? 0 : (number(attempt.gamescopeHz) ?? 0);
    if (backend === 'stream' && gamescopeHz <= 0) continue;
    tries.push({
      gamescopeHz,
      seconds,
      captureFps: number(attempt.captureFps),
      ok: attempt.ok === true && seconds != null,
      ...(typeof attempt.error === 'string' ? { error: errorText(attempt.error) } : {}),
    });
  }
  const finished = tries.filter((attempt) => attempt.ok);
  finished.sort((a, b) => (a.seconds ?? Infinity) - (b.seconds ?? Infinity));
  const ok = finished.length > 0;
  let error: string | null = null;
  if (!ok) {
    error = tries.find((attempt) => attempt.error)?.error ?? 'No benchmark attempt finished';
    if (typeof body.error === 'string' && body.error) error = errorText(body.error);
  }
  return {
    backend,
    tries,
    pick: backend === 'stream' ? (finished[0]?.gamescopeHz ?? null) : null,
    source: body.source === 'bundled' ? 'bundled' : 'match',
    ok,
    error,
  };
}
