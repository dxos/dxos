//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as Stage from './Stage';

/**
 * Terminal commit for a pipeline: applies a stage's output value. Keeps stages pure — they emit
 * typed `Out` descriptions and the sink performs the side effect (in-memory capture in tests, a
 * database write in production).
 */
export type Sink<Out, Ctx, E = never> = (out: Out, ctx: Ctx) => Effect.Effect<void, E>;

export type RunOptions<In, Out, Ctx, E = never> = {
  /** Source items; the run drains and resolves when this stream ends. */
  readonly source: Stream.Stream<In, E>;
  /** Ordered stages; each stage's `Out` is the next stage's `In`. */
  readonly stages: readonly Stage.Stage<any, any, Ctx, E>[];
  /** Terminal commit for the final stage output. */
  readonly sink: Sink<Out, Ctx, E>;
  /** Shared context injected into every stage and the sink. */
  readonly context: Ctx;
  /** Pipeline-level overflow policy. Defaults to `suspend` (back pressure, never drop). */
  readonly overflow?: Stage.Overflow;
  /** Pipeline-level bounded-buffer capacity. */
  readonly bufferSize?: number;
};

/**
 * Run a pipeline: fold the stages over the source, apply the overflow buffer, and drain to the
 * sink. Cancellation is structural — interrupting the returned effect interrupts the stream and
 * all in-flight stage work; there are no daemon fibers to leak.
 *
 * `undefined` emitted by any stage means "no output for that item" and is dropped between stages
 * and before the sink, so a pipeline can never deliver `undefined` as a meaningful value. The
 * source, all stages, and the sink share one error type `E`; mixing stages with distinct error
 * types requires widening to their union at the call site.
 */
export const run = <In, Out, Ctx, E = never>(options: RunOptions<In, Out, Ctx, E>): Effect.Effect<void, E> => {
  const { source, stages, sink, context, overflow = 'suspend', bufferSize = Stage.DEFAULT_BUFFER_SIZE } = options;

  // Fold stages left-to-right; each stage's Out is the next stage's In. A stage may emit
  // `undefined` to no-op for an item; that value is dropped before it reaches the next stage
  // (and before the sink), so no-op is well-defined at every position in the chain, not only
  // the terminal stage. The `unknown`/`any` here are the heterogeneous-chain type-system
  // boundary — confined to this fold, never surfacing in stage-author or caller signatures.
  const chained = stages.reduce<Stream.Stream<unknown, E>>(
    (stream, stage) => stage.transform(stream, context).pipe(Stream.filter((item) => item !== undefined)),
    source,
  );

  return chained.pipe(
    Stream.buffer({ capacity: bufferSize, strategy: overflow }),
    // Narrow the chain's final output to `Out` for the sink (upstream already dropped `undefined`).
    Stream.filter((out): out is Out => out !== undefined),
    Stream.runForEach((out) => sink(out, context)),
  );
};
