//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type Sink } from './Sink';
import * as Stage from './Stage';

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
 */
export const run = <In, Out, Ctx, E = never>(options: RunOptions<In, Out, Ctx, E>): Effect.Effect<void, E> => {
  const { source, stages, sink, context, overflow = 'suspend', bufferSize = Stage.DEFAULT_BUFFER_SIZE } = options;

  // Heterogeneous chain: each stage's output type feeds the next stage's input. This is a genuine
  // type-system boundary (a typed list of transforms of differing types); the `unknown`/`any` are
  // confined to this fold and never surface in stage-author or caller signatures.
  const chained = stages.reduce<Stream.Stream<unknown, E>>((stream, stage) => stage.transform(stream, context), source);

  return chained.pipe(
    Stream.buffer({ capacity: bufferSize, strategy: overflow }),
    // Stages may emit `undefined` to no-op; drop before the sink.
    Stream.filter((out): out is Out => out !== undefined),
    Stream.runForEach((out) => sink(out, context)),
  );
};
