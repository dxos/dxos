//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

/**
 * Overflow policy applied when a consumer cannot keep pace, mapped onto `Stream.buffer` strategies.
 * - `suspend`: back pressure — never drop (default; correct for email/document processing).
 * - `sliding`: drop the oldest buffered item, keep the latest (correct for live transcription).
 * - `dropping`: drop the newest item when the buffer is full.
 */
export type Overflow = 'suspend' | 'sliding' | 'dropping';

/** Default bounded-buffer capacity for both pipeline-level and per-stage buffering. */
export const DEFAULT_BUFFER_SIZE = 16;

/**
 * A pipeline stage: a `Stream → Stream` transform sharing the pipeline's injected context. Authors
 * build stages with {@link map} / {@link window} / {@link filter}; `transform` is the escape hatch.
 */
export interface Stage<in In, out Out, in Ctx, out E = never> {
  readonly id: string;
  transform(input: Stream.Stream<In, E>, ctx: Ctx): Stream.Stream<Out, E>;
}

/** Options shared by buffering stage constructors. */
type BufferOptions = {
  /** Per-stage overflow override; when set, a bounded buffer is inserted downstream of the stage. */
  readonly overflow?: Overflow;
  /** Buffer capacity for the per-stage override. */
  readonly bufferSize?: number;
};

export type MapOptions = BufferOptions & {
  /** In-flight parallelism. Defaults to 1 (ordered + back-pressured); higher values may reorder. */
  readonly concurrency?: number;
};

export type WindowOptions = BufferOptions;

// A per-stage buffer is inserted only when an overflow override is requested; otherwise the stage
// stays a pure transform and relies on the pipeline-level buffer.
const withBuffer =
  (options: BufferOptions) =>
  <A, E>(stream: Stream.Stream<A, E>): Stream.Stream<A, E> =>
    options.overflow
      ? Stream.buffer(stream, { capacity: options.bufferSize ?? DEFAULT_BUFFER_SIZE, strategy: options.overflow })
      : stream;

/** 1:1 async transform. `concurrency` defaults to 1 (ordered). */
export const map = <In, Out, Ctx, E = never>(
  id: string,
  fn: (item: In, ctx: Ctx) => Effect.Effect<Out, E>,
  options: MapOptions = {},
): Stage<In, Out, Ctx, E> => ({
  id,
  transform: (input, ctx) =>
    input.pipe(
      Stream.mapEffect((item) => fn(item, ctx), { concurrency: options.concurrency ?? 1 }),
      withBuffer(options),
    ),
});

/**
 * Sliding-window transform: invokes `fn` once per incoming item with a fixed-size rolling view of
 * the last `size` items. The window is bounded by `size`, so memory does not grow with stream
 * length; it composes with (and is distinct from) the overflow buffer, which bounds rate mismatch.
 */
export const window = <In, Out, Ctx, E = never>(
  id: string,
  size: number,
  fn: (window: readonly In[], ctx: Ctx) => Effect.Effect<Out, E>,
  options: WindowOptions = {},
): Stage<In, Out, Ctx, E> => ({
  id,
  transform: (input, ctx) =>
    input.pipe(
      Stream.mapAccum([] as readonly In[], (buffer, item) => {
        const next = [...buffer, item].slice(-size);
        return [next, next];
      }),
      Stream.mapEffect((buffer) => fn(buffer, ctx), { concurrency: 1 }),
      withBuffer(options),
    ),
});

/** Drop items that do not match `pred`. */
export const filter = <In, Ctx, E = never>(id: string, pred: (item: In) => boolean): Stage<In, In, Ctx, E> => ({
  id,
  transform: (input) => input.pipe(Stream.filter(pred)),
});
