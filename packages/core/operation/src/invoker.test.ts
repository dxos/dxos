//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Ref from 'effect/Ref';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as TestClock from 'effect/TestClock';
import { describe, expect, test } from 'vitest';

import { NoHandlerError } from './errors';
import * as OperationInvoker from './invoker';
import * as Operation from './operation';
import * as OperationResolver from './resolver';

//
// Test Operations
//

const Compute = Operation.make({
  schema: {
    input: Schema.Struct({ value: Schema.Number }),
    output: Schema.Struct({ value: Schema.Number }),
  },
  meta: { key: 'test.compute' },
});

const ToString = Operation.make({
  schema: {
    input: Schema.Struct({ value: Schema.Number }),
    output: Schema.Struct({ string: Schema.String }),
  },
  meta: { key: 'test.to-string' },
});

const Add = Operation.make({
  schema: {
    input: Schema.Tuple(Schema.Number, Schema.Number),
    output: Schema.Number,
  },
  meta: { key: 'test.add' },
});

const SideEffect = Operation.make({
  schema: {
    input: Schema.Void,
    output: Schema.Void,
  },
  meta: { key: 'test.side-effect' },
});

//
// Test Handlers
//

const computeHandler = OperationResolver.make({
  operation: Compute,
  handler: (data) =>
    Effect.gen(function* () {
      yield* Effect.sleep(data.value * 10);
      return { value: data.value * 2 };
    }),
});

const toStringHandler = OperationResolver.make({
  operation: ToString,
  handler: (data) => Effect.succeed({ string: String(data.value) }),
});

const addHandler = OperationResolver.make({
  operation: Add,
  handler: (data) => Effect.succeed(data[0] + data[1]),
});

const sideEffectHandler = OperationResolver.make({
  operation: SideEffect,
  handler: () => Effect.succeed(undefined),
});

//
// Test Utilities
//

type EventCollector = {
  events: OperationInvoker.InvocationEvent[];
  waitForEvents: (count: number) => Effect.Effect<void>;
  dispose: Effect.Effect<void>;
};

const createEventCollector = (invoker: OperationInvoker.OperationInvoker): Effect.Effect<EventCollector> =>
  Effect.gen(function* () {
    const events: OperationInvoker.InvocationEvent[] = [];
    const waiterRef = yield* Ref.make<{ count: number; deferred: Deferred.Deferred<void> } | null>(null);

    const checkWaiter = Effect.gen(function* () {
      const waiter = yield* Ref.get(waiterRef);
      if (waiter && events.length >= waiter.count) {
        yield* Deferred.succeed(waiter.deferred, undefined);
        yield* Ref.set(waiterRef, null);
      }
    });

    const fiber = yield* Stream.fromPubSub(invoker.invocations).pipe(
      Stream.runForEach((event) =>
        Effect.gen(function* () {
          events.push(event);
          yield* checkWaiter;
        }),
      ),
      Effect.fork,
    );

    // Yield to ensure subscription is established
    yield* Effect.yieldNow();

    return {
      events,
      waitForEvents: (count: number) =>
        Effect.gen(function* () {
          if (events.length >= count) return;
          const deferred = yield* Deferred.make<void>();
          yield* Ref.set(waiterRef, { count, deferred });
          // Check again in case events arrived between check and setting ref
          yield* checkWaiter;
          yield* Deferred.await(deferred);
        }),
      dispose: Fiber.interrupt(fiber),
    };
  });

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
      const handlers: OperationResolver.OperationResolver[] = [];
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

  it.effect('filter handlers by predicate', () =>
    Effect.gen(function* () {
      const conditionalHandler: OperationResolver.OperationResolver = {
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
      const hoistedHandler: OperationResolver.OperationResolver = {
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
      const conditionalHandler: OperationResolver.OperationResolver = {
        operation: Compute,
        filter: (data: { value: number }) => data?.value === 1,
        handler: (data: { value: number }) => Effect.succeed({ value: data.value * 2 }),
      };
      const fallbackHandler: OperationResolver.OperationResolver = {
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
      const result = yield* invoker.invoke(SideEffect);

      expect(result).toBe(undefined);
    }),
  );

  it.effect('invocations pubsub receives events', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]));
      const collector = yield* createEventCollector(invoker);

      // Small delay to ensure subscription is ready
      yield* Effect.yieldNow();

      yield* invoker.invoke(ToString, { value: 1 });
      yield* invoker.invoke(ToString, { value: 2 });

      yield* collector.waitForEvents(2);

      expect(collector.events.length).toBe(2);
      expect(collector.events[0].input).toEqual({ value: 1 });
      expect(collector.events[1].input).toEqual({ value: 2 });

      yield* collector.dispose;
    }),
  );
});

describe('OperationInvoker.invokeSync', () => {
  test('invokes sync operation synchronously', ({ expect }) => {
    const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]));
    const result = invoker.invokeSync(ToString, { value: 42 });

    expect(result.error).toBeUndefined();
    expect(result.data?.string).toBe('42');
  });

  test('returns error for missing handler', ({ expect }) => {
    const invoker = OperationInvoker.make(() => Effect.succeed([]));
    const result = invoker.invokeSync(ToString, { value: 42 });

    expect(result.error).toBeDefined();
    expect(result.error).toBeInstanceOf(NoHandlerError);
  });
});

describe('OperationInvoker.invokePromise', () => {
  test('invokes operation and returns result', async ({ expect }) => {
    const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]));
    const result = await invoker.invokePromise(ToString, { value: 42 });

    expect(result.error).toBeUndefined();
    expect(result.data?.string).toBe('42');
  });

  test('returns error for missing handler', async ({ expect }) => {
    const invoker = OperationInvoker.make(() => Effect.succeed([]));
    const result = await invoker.invokePromise(ToString, { value: 42 });

    expect(result.error).toBeDefined();
    expect(result.error).toBeInstanceOf(NoHandlerError);
  });
});

//
// Type-level tests for OperationResolver.make service constraints.
//

describe('OperationResolver.make type safety', () => {
  test('handler using undeclared service is a type error', () => {
    class DeclaredService extends Context.Tag('@test/DeclaredService')<DeclaredService, { declared: () => void }>() {}
    class UndeclaredService extends Context.Tag('@test/UndeclaredService')<
      UndeclaredService,
      { undeclared: () => void }
    >() {}

    const opWithDeclaredService = Operation.make({
      schema: {
        input: Schema.Void,
        output: Schema.Void,
      },
      meta: { key: 'test.declared-service' },
      services: [DeclaredService],
    });

    // Using the declared service is allowed.
    OperationResolver.make({
      operation: opWithDeclaredService,
      handler: (_input) =>
        Effect.gen(function* () {
          yield* DeclaredService;
        }),
    });

    // Using an undeclared service should be a type error.
    OperationResolver.make({
      operation: opWithDeclaredService,
      handler: (_input) =>
        // @ts-expect-error - UndeclaredService is not in the operation's services
        Effect.gen(function* () {
          yield* UndeclaredService;
        }),
    });

    // Using Operation.Service is always allowed (provided by invoker).
    OperationResolver.make({
      operation: opWithDeclaredService,
      handler: (_input) =>
        Effect.gen(function* () {
          yield* Operation.schedule(SideEffect);
        }),
    });
  });
});
