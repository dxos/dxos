//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as TestClock from 'effect/TestClock';
import { describe, expect } from 'vitest';

import {
  Add,
  Compute,
  SideEffect,
  ToString,
  addHandler,
  computeHandler,
  createEventCollector,
  sideEffectHandler,
  toStringHandler,
} from '../testing';

import { NoHandlerError } from './errors';
import * as OperationInvoker from './operation-invoker';
import type { OperationResolver } from './operation-resolver';

describe('OperationInvoker', () => {
  it.effect('throws error if no handler found', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([]));
      const result = yield* invoker.invoke(Compute, { value: 1 }).pipe(Effect.either);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NoHandlerError);
      }
    }),
  );

  it.effect('matches operation to handler and executes', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]));
      const result = yield* invoker.invoke(ToString, { value: 42 });

      expect(result.string).toBe('42');
    }),
  );

  it.effect('update handlers dynamically', () =>
    Effect.gen(function* () {
      const handlers: OperationResolver[] = [];
      const invoker = OperationInvoker.make(() => Effect.succeed(handlers));

      // No handler registered.
      const error1 = yield* invoker.invoke(ToString, { value: 1 }).pipe(Effect.either);
      expect(error1._tag).toBe('Left');

      // Add handler.
      handlers.push(toStringHandler);
      const result = yield* invoker.invoke(ToString, { value: 1 });
      expect(result.string).toBe('1');

      // Remove handler.
      handlers.splice(handlers.indexOf(toStringHandler), 1);
      const error2 = yield* invoker.invoke(ToString, { value: 1 }).pipe(Effect.either);
      expect(error2._tag).toBe('Left');
    }),
  );

  it.effect('compose operation effects', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler]));

      // Fork both operations.
      const fiberA = yield* Effect.fork(invoker.invoke(Compute, { value: 1 }));
      // Advance clock for first operation (1 * 10ms).
      yield* TestClock.adjust('10 millis');
      const a = yield* Fiber.join(fiberA);

      const fiberB = yield* Effect.fork(invoker.invoke(Compute, { value: 2 }));
      // Advance clock for second operation (2 * 10ms).
      yield* TestClock.adjust('20 millis');
      const b = yield* Fiber.join(fiberB);

      expect(b.value - a.value).toBe(2);
    }),
  );

  it.effect('concurrent operation effects', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler]));

      // Fork both operations concurrently.
      const fiberA = yield* Effect.fork(invoker.invoke(Compute, { value: 5 }));
      const fiberB = yield* Effect.fork(invoker.invoke(Compute, { value: 2 }));

      // Advance clock enough for both (max is 5 * 10ms = 50ms).
      yield* TestClock.adjust('50 millis');

      const [a, b] = yield* Fiber.join(Fiber.zip(fiberA, fiberB));
      expect(b.value - a.value).toBe(-6);
    }),
  );

  it.effect('mix & match effect and promise APIs', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler, computeHandler]));

      // Fork the compute operation and advance clock.
      const fiberA = yield* Effect.fork(invoker.invoke(Compute, { value: 2 }));
      yield* TestClock.adjust('20 millis');
      const a = yield* Fiber.join(fiberA);

      const b = yield* invoker.invoke(ToString, { value: a.value });
      expect(b.string).toBe('4');

      // Promise API still works (tested separately with live clock due to Promise semantics).
    }),
  );

  it.effect('filter handlers by predicate', () =>
    Effect.gen(function* () {
      const conditionalHandler: OperationResolver = {
        operation: Compute,
        filter: (data: { value: number }) => data?.value > 1,
        handler: (data: { value: number }) => Effect.succeed({ value: data.value * 3 }),
      };
      const invoker = OperationInvoker.make(() => Effect.succeed([conditionalHandler, computeHandler]));

      // value=1 should use computeHandler (multiplies by 2, has sleep).
      const fiberA = yield* Effect.fork(invoker.invoke(Compute, { value: 1 }));
      yield* TestClock.adjust('10 millis');
      const a = yield* Fiber.join(fiberA);
      expect(a.value).toBe(2);

      // value=2 should use conditionalHandler (multiplies by 3, no sleep).
      const b = yield* invoker.invoke(Compute, { value: 2 });
      expect(b.value).toBe(6);
    }),
  );

  it.effect('hoist handlers', () =>
    Effect.gen(function* () {
      const hoistedHandler: OperationResolver = {
        operation: Compute,
        position: 'hoist',
        handler: (data: { value: number }) => Effect.succeed({ value: data.value * 3 }),
      };
      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler, hoistedHandler]));
      const result = yield* invoker.invoke(Compute, { value: 1 });

      expect(result.value).toBe(3);
    }),
  );

  it.effect('fallback handlers', () =>
    Effect.gen(function* () {
      const conditionalHandler: OperationResolver = {
        operation: Compute,
        filter: (data: { value: number }) => data?.value === 1,
        handler: (data: { value: number }) => Effect.succeed({ value: data.value * 2 }),
      };
      const fallbackHandler: OperationResolver = {
        operation: Compute,
        position: 'fallback',
        handler: (data: { value: number }) => Effect.succeed({ value: data.value * 3 }),
      };
      const invoker = OperationInvoker.make(() => Effect.succeed([conditionalHandler, fallbackHandler]));

      const a = yield* invoker.invoke(Compute, { value: 1 });
      expect(a.value).toBe(2);

      const b = yield* invoker.invoke(Compute, { value: 2 });
      expect(b.value).toBe(6);
    }),
  );

  it.effect('non-struct inputs & outputs', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([addHandler]));
      const result = yield* invoker.invoke(Add, [1, 1]);

      expect(result).toBe(2);
    }),
  );

  it.effect('empty inputs & outputs', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([sideEffectHandler]));
      const result = yield* invoker.invoke(SideEffect, undefined);

      expect(result).toBe(undefined);
    }),
  );

  it.effect('handler can invoke another operation sequentially', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([computeAndStringifyHandler, toStringHandler]));

      // Handler that computes and then converts result to string.
      const computeAndStringifyHandler: OperationResolver = {
        operation: Compute,
        handler: (data: { value: number }) =>
          Effect.gen(function* () {
            const doubled = data.value * 2;
            // Invoke ToString operation and wait for result (no sleep in toString).
            const stringResult = yield* invoker.invoke(ToString, { value: doubled });
            return { value: doubled, stringified: stringResult.string };
          }),
      };

      const collector = yield* createEventCollector(invoker);

      const result = yield* invoker.invoke(Compute, { value: 5 });

      // Wait for both events to be collected.
      yield* collector.waitForEvents(2);

      // Compute result: 5 * 2 = 10.
      expect(result.value).toBe(10);
      expect((result as any).stringified).toBe('10');

      // Both operations should emit events.
      expect(collector.events.length).toBe(2);
      expect(collector.events[0].operation.meta.key).toBe('test.to-string');
      expect(collector.events[1].operation.meta.key).toBe('test.compute');

      yield* collector.dispose;
    }),
  );

  it.effect('handler can fork another operation (fire-and-forget)', () =>
    Effect.gen(function* () {
      let sideEffectExecuted = false;
      const trackingSideEffectHandler: OperationResolver = {
        operation: SideEffect,
        handler: () =>
          Effect.sync(() => {
            sideEffectExecuted = true;
            return undefined;
          }),
      };

      const invoker = OperationInvoker.make(() =>
        Effect.succeed([computeWithForkedSideEffect, trackingSideEffectHandler]),
      );

      // Handler that forks a side effect and returns immediately.
      const computeWithForkedSideEffect: OperationResolver = {
        operation: Compute,
        handler: (data: { value: number }) =>
          Effect.gen(function* () {
            // Fork the side effect to run independently.
            yield* Effect.fork(invoker.invoke(SideEffect, undefined));
            return { value: data.value * 2 };
          }),
      };

      const collector = yield* createEventCollector(invoker);

      // Side effect not executed yet.
      expect(sideEffectExecuted).toBe(false);

      const result = yield* invoker.invoke(Compute, { value: 3 });

      // Compute returns immediately.
      expect(result.value).toBe(6);

      // Wait for both events (compute + side effect).
      yield* collector.waitForEvents(2);

      // Now side effect should be executed.
      expect(sideEffectExecuted).toBe(true);

      // Both operations should emit events.
      expect(collector.events.length).toBe(2);
      expect(collector.events.map((e) => e.operation.meta.key)).toContain('test.compute');
      expect(collector.events.map((e) => e.operation.meta.key)).toContain('test.side-effect');

      yield* collector.dispose;
    }),
  );

  it.effect('emits invocation events via stream', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]));
      const collector = yield* createEventCollector(invoker);

      yield* invoker.invoke(ToString, { value: 42 });
      yield* invoker.invoke(ToString, { value: 100 });

      // Wait for both events.
      yield* collector.waitForEvents(2);

      expect(collector.events.length).toBe(2);
      expect(collector.events[0].operation.meta.key).toBe('test.to-string');
      expect(collector.events[0].input.value).toBe(42);
      expect(collector.events[0].output.string).toBe('42');
      expect(collector.events[1].input.value).toBe(100);

      yield* collector.dispose;
    }),
  );

  it.effect('_invokeCore does not emit events', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]));
      const collector = yield* createEventCollector(invoker);

      // Regular invoke emits.
      yield* invoker.invoke(ToString, { value: 1 });
      yield* collector.waitForEvents(1);
      expect(collector.events.length).toBe(1);

      // Internal invoke does not emit.
      yield* invoker._invokeCore(ToString, { value: 2 });

      // The event count should still be 1 (no new events).
      expect(collector.events.length).toBe(1);

      yield* collector.dispose;
    }),
  );

  it('synchronous handler can be run with Effect.runSync', ({ expect }) => {
    let executed = false;
    const syncHandler: OperationResolver = {
      operation: SideEffect,
      handler: () =>
        Effect.sync(() => {
          executed = true;
          return undefined;
        }),
    };
    const invoker = OperationInvoker.make(() => Effect.succeed([syncHandler]));

    // Effect.runSync throws if the effect requires async execution.
    // This verifies the invoker doesn't introduce unnecessary async boundaries.
    Effect.runSync(invoker.invoke(SideEffect, undefined));

    expect(executed).toBe(true);
  });

  it('asynchronous handler throws when run with Effect.runSync', ({ expect }) => {
    const asyncHandler: OperationResolver = {
      operation: Compute,
      handler: (data: { value: number }) =>
        Effect.gen(function* () {
          yield* Effect.sleep(10);
          return { value: data.value * 2 };
        }),
    };
    const invoker = OperationInvoker.make(() => Effect.succeed([asyncHandler]));

    // Effect.runSync should throw when the handler requires async execution.
    expect(() => Effect.runSync(invoker.invoke(Compute, { value: 1 }))).toThrow();
  });
});
