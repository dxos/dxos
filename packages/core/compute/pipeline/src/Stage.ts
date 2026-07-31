//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as Progress from './Progress';

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
 * A pipeline stage: a pipeable `Stream → Stream` transform, the same shape `Stream.mapEffect` /
 * `Stream.filter` already have — generic over the *input* stream's own error/requirements (`E0`/
 * `R0`) and unioning in the stage's own `E`/`R`, so stages compose in a `pipe` chain the same way
 * Effect's own Stream operators do. Authors build stages with {@link map} / {@link window} /
 * {@link filter}; shared dependencies flow through `R`, provided once at the edge via
 * `Effect.provide`.
 */
export type Stage<In, Out, E = never, R = never> = <E0 = never, R0 = never>(
  self: Stream.Stream<In, E0, R0>,
) => Stream.Stream<Out, E0 | E, R0 | R>;

/** Options shared by buffering stage constructors. */
type BufferOptions = {
  /**
   * Per-stage overflow override; when set, a bounded buffer is inserted at the stage's async
   * boundary. For {@link map} the buffer sits *before* `mapEffect`, so under load it sheds/coalesces
   * in-flight input (`sliding` keeps the latest queued item — true latest-wins — `dropping` drops
   * new arrivals while a run is in flight). For {@link window} it sits after windowing (a window
   * must see every item), bounding output rate.
   */
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
  <A, E, R>(stream: Stream.Stream<A, E, R>): Stream.Stream<A, E, R> =>
    options.overflow
      ? Stream.buffer(stream, { capacity: options.bufferSize ?? DEFAULT_BUFFER_SIZE, strategy: options.overflow })
      : stream;

/**
 * 1:1 async transform. `fn` may return `undefined` to no-op for an item; the value is dropped
 * before it reaches the next stage, so the returned stage's `Out` excludes `undefined`.
 * `concurrency` defaults to 1 (ordered). `id` labels the per-item span for tracing.
 *
 * `Out`/`E`/`R` always infer from `fn`'s result; `In` only infers when the stage is composed inline
 * in a `pipe` (pinned by the upstream stream). Built as a standalone value, pin `In` by annotating
 * the callback parameter (`(item: T) => …`) or the binding (`const s: Stage<…> = …`). The four type
 * parameters are intentionally all-or-nothing: passing a partial list (e.g. `map<In, Out>(…)`) is a
 * compile error rather than silently forcing `E`/`R` to `never` and rejecting a service-using `fn`.
 */
export const map =
  <In, Out, E, R>(
    id: string,
    fn: (item: In) => Effect.Effect<Out, E, R>,
    options: MapOptions = {},
  ): Stage<In, Exclude<Out, undefined>, E, R> =>
  <E0, R0>(self: Stream.Stream<In, E0, R0>) =>
    self.pipe(
      withBuffer(options),
      // The overflow buffer sits *before* `mapEffect`: while a run is in flight it absorbs new
      // input, so `sliding` coalesces to the latest queued item (latest-wins) and `dropping` sheds
      // new arrivals. A buffer after `mapEffect` would bound outputs, not in-flight input, leaving
      // overflow inert.
      Stream.mapEffect((item) => fn(item).pipe(Effect.withSpan(id)), { concurrency: options.concurrency ?? 1 }),
      Stream.filter((item): item is Exclude<Out, undefined> => item !== undefined),
    );

/**
 * Sliding-window transform: invokes `fn` once per incoming item with a fixed-size rolling view of
 * the last `size` items. The window is bounded by `size`, so memory does not grow with stream
 * length; it composes with (and is distinct from) the overflow buffer, which bounds rate mismatch.
 * `fn` may return `undefined` to no-op, narrowing `Out` the same way {@link map} does. Type
 * parameters follow {@link map}: `Out`/`E`/`R` infer from `fn`, `In` is pinned inline by the
 * upstream or (standalone) by annotating the callback parameter or the binding, and a partial type
 * argument list is a compile error.
 */
export const window = <In, Out, E, R>(
  id: string,
  size: number,
  fn: (window: readonly In[]) => Effect.Effect<Out, E, R>,
  options: WindowOptions = {},
): Stage<In, Exclude<Out, undefined>, E, R> => {
  // A window must retain at least one item; a non-positive size makes `.slice(-size)` degenerate
  // (`slice(-0)` returns the whole array, growing unbounded).
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`Stage.window size must be a positive integer: ${size}`);
  }

  return <E0, R0>(self: Stream.Stream<In, E0, R0>) =>
    self.pipe(
      Stream.mapAccum([] as readonly In[], (buffer, item) => {
        const next = [...buffer, item].slice(-size);
        return [next, next];
      }),
      Stream.mapEffect((buffer) => fn(buffer).pipe(Effect.withSpan(id)), { concurrency: 1 }),
      withBuffer(options),
      Stream.filter((item): item is Exclude<Out, undefined> => item !== undefined),
    );
};

/** Drop items that do not match `pred`. */
export const filter =
  <In>(id: string, pred: (item: In) => boolean): Stage<In, In> =>
  <E0, R0>(self: Stream.Stream<In, E0, R0>) =>
    self.pipe(Stream.filter(pred));

/**
 * A pass-through stage that reports live progress to the {@link Progress} registry: it registers the
 * task (with an optional item `total`), advances the item index as each item flows through, marks the
 * task done only when the stream ends successfully, and marks it failed if the stream errors.
 * Progress is thus an artifact of the pipeline itself — the same stage works in the app (feeding a
 * reactive panel) and in tests (feeding a file sink).
 */
export const track =
  <In>(name: string, options: { total?: number; label?: string } = {}): Stage<In, In, never, Progress.Progress> =>
  <E0, R0>(self: Stream.Stream<In, E0, R0>) =>
    Stream.unwrap(
      Effect.map(Progress.Progress, (progress) => {
        const handle = progress.task(name, options);
        // `done` only on successful completion (a concatenated terminal effect, unreached on error);
        // `fail` on the error path. A finalizer/`ensuring` would report done even for a failed stream.
        return Stream.concat(
          self.pipe(
            Stream.tap(() => Effect.sync(() => handle.advance())),
            Stream.tapErrorCause((cause) => Effect.sync(() => handle.fail(Cause.pretty(cause)))),
          ),
          Stream.execute(Effect.sync(() => handle.done())),
        );
      }),
    );
