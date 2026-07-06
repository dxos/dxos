//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Stream from 'effect/Stream';

import * as Stage from './Stage';

/**
 * Terminal commit for a pipeline: applies a stage's output value. Keeps stages pure — they emit
 * typed `Out` descriptions and the sink performs the side effect (in-memory capture in tests, a
 * database write in production).
 */
export type Sink<Out, E = never, R = never> = (out: Out) => Effect.Effect<void, E, R>;

export type RunOptions<Out, E = never, R = never> = {
  /** Terminal commit for the final stage output. */
  readonly sink: Sink<Out, E, R>;
  /** Pipeline-level overflow policy. Defaults to `suspend` (back pressure, never drop). */
  readonly overflow?: Stage.Overflow;
  /** Pipeline-level bounded-buffer capacity. */
  readonly bufferSize?: number;
};

/**
 * Drain a composed stream to a sink: apply the pipeline-level overflow buffer and run to
 * completion. Cancellation is structural — interrupting the returned effect interrupts the stream
 * and all in-flight stage work; there are no daemon fibers to leak. Compose with `pipe`, chaining
 * `Stage` transforms ahead of it: `pipe(source, Stage.map(...), Stage.window(...), Pipeline.run({
 * sink }))`. Mirrors `Stream.runForEach`'s own shape: the sink's `E`/`R` (bound once, from `options`)
 * are kept independent of — and unioned with — the piped-in stream's own `E`/`R`, so the incoming
 * stream's generics aren't forced to unify with the sink's at the call site.
 */
export const run: {
  <Out, E2, R2>(
    options: RunOptions<Out, E2, R2>,
  ): <E, R>(source: Stream.Stream<Out, E, R>) => Effect.Effect<void, E2 | E, R2 | R>;
  <Out, E, R, E2, R2>(
    source: Stream.Stream<Out, E, R>,
    options: RunOptions<Out, E2, R2>,
  ): Effect.Effect<void, E2 | E, R2 | R>;
} = Function.dual(2, (source: Stream.Stream<any, any, any>, options: RunOptions<any, any, any>) =>
  source.pipe(
    Stream.buffer({
      capacity: options.bufferSize ?? Stage.DEFAULT_BUFFER_SIZE,
      strategy: options.overflow ?? 'suspend',
    }),
    Stream.runForEach(options.sink),
  ),
);
