//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as Stage from '../Stage';
import { Metrics, useMetrics } from './metrics';

/**
 * Wrap a {@link Stage.Stage} to auto-record per-stage metrics — `${name}.in`, `${name}.out`,
 * `${name}.errors` (counts) and `${name}.ms` (summed processing latency) — through the ambient
 * {@link Metrics} service, with no changes to the stage itself. Compose it in place of the stage:
 * `source.pipe(instrument('extract', s), …)`. The wrapped stage additionally requires `Metrics` in
 * its environment (provided at the edge by the benchmark runner).
 *
 * Latency is measured as the wall-clock between an item entering and leaving the stage. For a
 * sequential 1:1 stage (`Stage.map`, the common case) that is exactly the per-item processing time;
 * for reordering or fan-out stages the FIFO pairing is approximate but the sum stays a sensible
 * aggregate. Divide `${name}.ms` by `${name}.out` for the average.
 */
export const instrument =
  <In, Out, E, R>(name: string, stage: Stage.Stage<In, Out, E, R>): Stage.Stage<In, Out, E, R | Metrics> =>
  (self) => {
    // Entry timestamps, oldest first; each item leaving the stage is paired with the oldest still
    // pending. Exact for a sequential 1:1 stage; approximate (but sum-preserving) otherwise.
    const pending: number[] = [];
    return stage(
      self.pipe(
        Stream.tap(() =>
          Clock.currentTimeMillis.pipe(
            Effect.flatMap((now) =>
              useMetrics((metrics) => metrics.inc(`${name}.in`)).pipe(
                Effect.zipRight(Effect.sync(() => void pending.push(now))),
              ),
            ),
          ),
        ),
      ),
    ).pipe(
      Stream.tap(() =>
        Clock.currentTimeMillis.pipe(
          Effect.flatMap((now) => {
            const start = pending.shift();
            const elapsed = start === undefined ? 0 : now - start;
            return useMetrics((metrics) => metrics.inc(`${name}.out`)).pipe(
              Effect.zipRight(useMetrics((metrics) => metrics.inc(`${name}.ms`, elapsed))),
            );
          }),
        ),
      ),
      Stream.tapError(() => useMetrics((metrics) => metrics.inc(`${name}.errors`))),
    );
  };
