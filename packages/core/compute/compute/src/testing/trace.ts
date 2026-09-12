//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Trace from '../Trace.ts';

interface Collector {
  readonly messages: Trace.Message[];
  /**
   * Monotonic counter rather than `Date.now`: several writes land in the same millisecond, and a tie
   * leaves the order of the trace — and anything built from it — undefined.
   */
  readonly clock: () => number;
}

/**
 * Collects everything written to the trace so a test can read it back, in place of a feed or a
 * hand-rolled sink:
 *
 * ```ts
 * yield* Trace.write(SomeEvent, {});
 * const messages = yield* TestTraceService.messages;
 * ```
 *
 * {@link TestTraceService.layer} provides the collector together with the {@link Trace.TraceService}
 * and {@link Trace.TraceSink} that feed it.
 */
export class TestTraceService extends Context.Service<TestTraceService, Collector>()('@dxos/compute/TestTraceService') {
  /** The messages written so far, in write order. */
  static readonly messages: Effect.Effect<readonly Trace.Message[], never, TestTraceService> = Effect.map(
    TestTraceService,
    ({ messages }) => [...messages],
  );

  /** The flattened events of every message written so far, in write order. */
  static readonly events: Effect.Effect<readonly Trace.FlatEvent[], never, TestTraceService> = Effect.map(
    TestTraceService,
    ({ messages }) => messages.flatMap((message) => Trace.flatten(message)),
  );

  /** The collector, the writer, and the sink between them. */
  static readonly layer: Layer.Layer<TestTraceService | Trace.TraceSink | Trace.TraceService> = Layer.suspend(() =>
    Layer.unwrap(Effect.map(TestTraceService, ({ clock }) => Trace.testTraceService({ clock }))).pipe(
      Layer.provideMerge(sinkLayer.pipe(Layer.provideMerge(collectorLayer))),
    ),
  );

  /**
   * Runs the effect writing under `meta` — the pid and conversation a real emitter would carry —
   * keeping the collector's clock, so timestamps stay ordered across nested scopes.
   */
  static readonly withMeta = <A, E, R>(
    meta: Trace.Meta,
    effect: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E, Exclude<R, Trace.TraceService> | TestTraceService | Trace.TraceSink> =>
    Effect.flatMap(TestTraceService, ({ clock }) => Effect.provide(effect, Trace.testTraceService({ meta, clock })));
}

const collectorLayer: Layer.Layer<TestTraceService> = Layer.sync(TestTraceService, () => {
  let counter = 0;
  return { messages: [], clock: () => ++counter };
});

const sinkLayer: Layer.Layer<Trace.TraceSink, never, TestTraceService> = Layer.effect(
  Trace.TraceSink,
  Effect.map(TestTraceService, ({ messages }) => ({
    write: (message: Trace.Message) => {
      messages.push(message);
    },
  })),
);
