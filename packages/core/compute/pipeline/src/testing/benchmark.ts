//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Metrics, type MetricsSnapshot, type MetricValue, makeMetrics } from './metrics';

/** A named configuration to benchmark (e.g. a model). */
export type BenchmarkVariant<Config> = {
  readonly name: string;
  readonly config: Config;
};

/** One variant's merged metrics: `total.ms`, per-stage `instrument` counters, and evaluator output. */
export type VariantResult = {
  readonly variant: string;
  readonly metrics: MetricsSnapshot;
};

export type BenchmarkResult = {
  readonly variants: readonly VariantResult[];
};

export type BenchmarkOptions<Config, Output, E, R> = {
  readonly variants: readonly BenchmarkVariant<Config>[];
  /**
   * Run the (instrumented) pipeline for one variant and return whatever the evaluator needs
   * (e.g. captured sink outputs). Stage counters and any `Metrics` writes are collected
   * automatically. `Metrics` is provided by the runner.
   */
  readonly program: (config: Config) => Effect.Effect<Output, E, R | Metrics>;
  /**
   * Compute domain metrics for the variant. Effectful, so it can query services (fact store, ECHO
   * db) that the pipeline populated. Its returned map is merged over the auto-collected metrics.
   */
  readonly evaluate?: (config: Config, output: Output) => Effect.Effect<MetricsSnapshot, E, R | Metrics>;
};

/**
 * Run a pipeline across variants (e.g. models) and collect a comparable metrics row per variant:
 * total wall-clock, per-stage {@link instrument} counters, and the evaluator's domain metrics. A
 * variant whose program or evaluator fails is recorded with an `error` (plus whatever metrics were
 * captured before it failed) rather than aborting the whole comparison.
 */
export const runBenchmark = <Config, Output, E, R>(
  options: BenchmarkOptions<Config, Output, E, R>,
): Effect.Effect<BenchmarkResult, never, Exclude<R, Metrics>> =>
  Effect.gen(function* () {
    const variants: VariantResult[] = [];
    for (const variant of options.variants) {
      const metrics = makeMetrics();
      const layer = Layer.succeed(Metrics, metrics);
      const row = yield* Effect.gen(function* () {
        const [duration, output] = yield* Effect.timed(options.program(variant.config));
        const domain = options.evaluate ? yield* options.evaluate(variant.config, output) : {};
        const snapshot = yield* metrics.snapshot;
        return {
          'total.ms': Math.round(Duration.toMillis(duration)),
          ...snapshot,
          ...domain,
        } satisfies MetricsSnapshot;
      }).pipe(
        Effect.provide(layer),
        Effect.catchAllCause((cause) =>
          metrics.snapshot.pipe(
            Effect.map(
              (snapshot) => ({ ...snapshot, error: Cause.pretty(cause).split('\n')[0] }) satisfies MetricsSnapshot,
            ),
          ),
        ),
      );
      variants.push({ variant: variant.name, metrics: row });
    }
    return { variants };
  });

const format = (value: MetricValue | undefined): string =>
  value === undefined ? '' : typeof value === 'number' ? String(Math.round(value * 100) / 100) : value;

/** Render a benchmark result as a fixed-width metric × variant table (metrics as rows). */
export const renderBenchmark = (result: BenchmarkResult): string => {
  const metricNames = [...new Set(result.variants.flatMap((variant) => Object.keys(variant.metrics)))].sort();
  const header = ['metric', ...result.variants.map((variant) => variant.variant)];
  const rows = metricNames.map((metric) => [
    metric,
    ...result.variants.map((variant) => format(variant.metrics[metric])),
  ]);
  const widths = header.map((_cell, column) => Math.max(...[header, ...rows].map((row) => row[column].length)));
  const line = (row: readonly string[]) => row.map((cell, column) => cell.padEnd(widths[column])).join('  ');
  return [line(header), widths.map((width) => '-'.repeat(width)).join('  '), ...rows.map(line)].join('\n');
};
