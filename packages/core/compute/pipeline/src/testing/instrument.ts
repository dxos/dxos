//
// Copyright 2026 DXOS.org
//

import * as Stream from 'effect/Stream';

import * as Stage from '../Stage';
import { Metrics, useMetrics } from './metrics';

/**
 * Wrap a {@link Stage.Stage} to auto-record per-stage counters — `${name}.in`, `${name}.out`, and
 * `${name}.errors` — through the ambient {@link Metrics} service, with no changes to the stage
 * itself. Compose it in place of the stage: `source.pipe(instrument('summarize', s), …)`. The
 * wrapped stage additionally requires `Metrics` in its environment (provided at the edge by the
 * benchmark runner). Per-item latency is left to stages that opt in via `Metrics.time`, since a
 * pipeable stage's internal timing isn't observable from outside.
 */
export const instrument =
  <In, Out, E, R>(name: string, stage: Stage.Stage<In, Out, E, R>): Stage.Stage<In, Out, E, R | Metrics> =>
  (self) =>
    stage(self.pipe(Stream.tap(() => useMetrics((metrics) => metrics.inc(`${name}.in`))))).pipe(
      Stream.tap(() => useMetrics((metrics) => metrics.inc(`${name}.out`))),
      Stream.tapError(() => useMetrics((metrics) => metrics.inc(`${name}.errors`))),
    );
