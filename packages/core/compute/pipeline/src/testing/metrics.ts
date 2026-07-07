//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

/** A single reported metric: a running number (counter/sum) or a label. */
export type MetricValue = number | string;

/** A flat name → value map, as merged into a benchmark row. */
export type MetricsSnapshot = Record<string, MetricValue>;

/**
 * Metrics sink a benchmark run writes to. Stages opt in to emit domain metrics (`inc`/`record`/
 * `time`); the {@link instrument} wrapper writes per-stage counters through the same service. One
 * instance per benchmark variant, provided at the edge via {@link Metrics.layer}.
 */
export interface MetricsApi {
  /** Add `by` (default 1) to a numeric counter. */
  readonly inc: (name: string, by?: number) => Effect.Effect<void>;
  /** Set a value (last write wins) — for labels or gauges. */
  readonly record: (name: string, value: MetricValue) => Effect.Effect<void>;
  /** Time an effect: adds its duration (ms) to `${name}.ms` and increments `${name}.count`. */
  readonly time: <A, E, R>(name: string, effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  /** Current values. */
  readonly snapshot: Effect.Effect<MetricsSnapshot>;
}

export class Metrics extends Context.Tag('@dxos/pipeline/testing/Metrics')<Metrics, MetricsApi>() {
  /** A fresh, in-memory metrics instance. */
  static layer: Layer.Layer<Metrics> = Layer.sync(Metrics, () => makeMetrics());
}

/** Construct a standalone metrics sink (also usable directly in tests). */
export const makeMetrics = (): MetricsApi => {
  const values = new Map<string, MetricValue>();
  const addNumber = (name: string, by: number) => {
    const current = values.get(name);
    values.set(name, (typeof current === 'number' ? current : 0) + by);
  };
  const api: MetricsApi = {
    inc: (name, by = 1) => Effect.sync(() => addNumber(name, by)),
    record: (name, value) => Effect.sync(() => void values.set(name, value)),
    time: (name, effect) =>
      Effect.timed(effect).pipe(
        Effect.map(([duration, result]) => {
          addNumber(`${name}.ms`, Duration.toMillis(duration));
          addNumber(`${name}.count`, 1);
          return result;
        }),
      ),
    snapshot: Effect.sync(() => Object.fromEntries(values)),
  };
  return api;
};

/** Read the ambient {@link Metrics} service and apply `f` to it. */
export const useMetrics = <A, E, R>(
  f: (metrics: MetricsApi) => Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R | Metrics> => Effect.flatMap(Metrics, f);
