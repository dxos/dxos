//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Trace } from '@dxos/compute';

/**
 * Internal tag carrying the monotonic clock created by {@link collectTraceEvents}. Nested
 * {@link withMeta} scopes read it so every emitted message gets a strictly increasing
 * timestamp regardless of how many writes happened in the same wall-clock millisecond.
 */
class TestClock extends Context.Tag('@dxos/plugin-assistant/CollectTraceEvents/TestClock')<TestClock, () => number>() {}

/**
 * Runs the given Effect with a mock {@link Trace.TraceService} and {@link Trace.TraceSink}
 * whose writes accumulate into an in-memory list of {@link Trace.Message}s.
 *
 * Each `Trace.write(...)` call inside the effect produces one `Trace.Message` carrying the
 * meta of the innermost {@link withMeta} scope (or empty meta if none is provided). Useful
 * for building deterministic span fixtures without spinning up a feed sink.
 *
 * Timestamps are produced by an internal monotonic counter so multiple synchronous writes
 * are ordered in insertion order — wall-clock `Date.now()` would otherwise tie and corrupt
 * the resulting graph for fast tests.
 *
 * The effect is run synchronously; any failure is rethrown so callers don't pay error
 * boilerplate in tests.
 */
export const collectTraceEvents = <A, E>(
  effect: Effect.Effect<A, E, Trace.TraceService | Trace.TraceSink | TestClock>,
): Trace.Message[] => {
  const messages: Trace.Message[] = [];
  let counter = 0;
  const clock = () => {
    counter += 1;
    return counter;
  };

  const sinkLayer: Layer.Layer<Trace.TraceSink> = Layer.succeed(Trace.TraceSink, {
    write: (message) => {
      messages.push(message);
    },
  });
  const clockLayer: Layer.Layer<TestClock> = Layer.succeed(TestClock, clock);
  const traceLayer: Layer.Layer<Trace.TraceService> = Trace.testTraceService({ clock }).pipe(Layer.provide(sinkLayer));
  const layer = Layer.mergeAll(traceLayer, sinkLayer, clockLayer);

  const exit = Effect.runSyncExit(effect.pipe(Effect.provide(layer)));
  if (exit._tag === 'Failure') {
    throw new Error(`collectTraceEvents: effect failed\n${Cause.pretty(exit.cause)}`);
  }
  return messages;
};

/**
 * Wraps an effect so that {@link Trace.write} calls inside it tag their messages with the
 * given {@link Trace.Meta}. Nested `withMeta` scopes shadow the outer meta for their inner
 * effect — exactly the pattern needed to fixture multi-process traces (e.g. an agent
 * process containing nested operation processes).
 *
 * Implemented by re-providing a fresh {@link Trace.TraceService} layer over the existing
 * {@link Trace.TraceSink} and shared monotonic clock, so all messages still flow into the
 * same accumulator with monotonically increasing timestamps.
 */
export const withMeta = <A, E, R>(
  meta: Trace.Meta,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, Exclude<R, Trace.TraceService> | Trace.TraceSink | TestClock> =>
  Effect.flatMap(TestClock, (clock) => Effect.provide(effect, Trace.testTraceService({ meta, clock })));
