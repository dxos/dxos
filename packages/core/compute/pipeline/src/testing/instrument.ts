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
 * Latency is the wall-clock between the most recent input entering and an output leaving the stage.
 * For a sequential stage (`Stage.map`, the common case) the item just emitted is the last one pulled
 * in, so `${name}.ms` is the true per-item processing time — including drop/filter stages, whose
 * discarded inputs simply never produce an output to attribute. It is only approximate for a stage
 * that reorders or processes items concurrently (concurrency > 1), where the "most recent input" is
 * no longer the one being emitted. Divide `${name}.ms` by `${name}.out` for the average.
 */
export const instrument =
  <In, Out, E, R>(name: string, stage: Stage.Stage<In, Out, E, R>): Stage.Stage<In, Out, E, R | Metrics> =>
  (self) => {
    // Timestamp of the most recently ingested item. A sequential stage emits the item it last pulled,
    // so pairing an output with this (rather than FIFO-oldest) stays correct when inputs are dropped.
    let lastIn: number | undefined;
    return stage(
      self.pipe(
        Stream.tap(() =>
          Clock.currentTimeMillis.pipe(
            Effect.flatMap((now) =>
              useMetrics((metrics) => metrics.inc(`${name}.in`)).pipe(
                Effect.zipRight(Effect.sync(() => void (lastIn = now))),
              ),
            ),
          ),
        ),
      ),
    ).pipe(
      Stream.tap(() =>
        Clock.currentTimeMillis.pipe(
          Effect.flatMap((now) => {
            const elapsed = lastIn === undefined ? 0 : now - lastIn;
            return useMetrics((metrics) => metrics.inc(`${name}.out`)).pipe(
              Effect.zipRight(useMetrics((metrics) => metrics.inc(`${name}.ms`, elapsed))),
            );
          }),
        ),
      ),
      Stream.tapError(() => useMetrics((metrics) => metrics.inc(`${name}.errors`))),
    );
  };
