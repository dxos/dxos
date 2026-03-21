//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Ref from 'effect/Ref';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as TestClock from 'effect/TestClock';
import { describe, expect, test } from 'vitest';

import { NoHandlerError } from './errors';
import * as OperationInvoker from './OperationInvoker';
import * as Operation from './Operation';

const testRuntime = ManagedRuntime.make(Layer.empty) as unknown as ManagedRuntime.ManagedRuntime<any, any>;

//
// Test Operations
//

const Compute = Operation.make({
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Struct({ value: Schema.Number }),
  meta: { key: 'test.compute' },
});

const ToString = Operation.make({
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Struct({ string: Schema.String }),
  meta: { key: 'test.to-string' },
});

const Add = Operation.make({
  input: Schema.Tuple(Schema.Number, Schema.Number),
  output: Schema.Number,
  meta: { key: 'test.add' },
});

const SideEffect = Operation.make({
  input: Schema.Void,
  output: Schema.Void,
  meta: { key: 'test.side-effect' },
});

//
// Test Handlers
//

const computeHandler = Operation.withHandler(Compute, (data) =>
  Effect.gen(function* () {
    yield* Effect.sleep(data.value * 10);
    return { value: data.value * 2 };
  }),
);

const toStringHandler = Operation.withHandler(ToString, (data) => Effect.succeed({ string: String(data.value) }));

const addHandler = Operation.withHandler(Add, (data) => Effect.succeed(data[0] + data[1]));

const sideEffectHandler = Operation.withHandler(SideEffect, () => Effect.succeed(undefined));

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
      const invoker = OperationInvoker.make(() => Effect.succeed([]), testRuntime);
      const result = yield* invoker.invoke(Compute, { value: 1 }).pipe(Effect.either);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NoHandlerError);
      }
    }),
  );

  it.effect('matches operation to handler and executes', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]), testRuntime);
      const result = yield* invoker.invoke(ToString, { value: 42 });

      expect(result.string).toBe('42');
    }),
  );

  it.effect('update handlers dynamically', () =>
    Effect.gen(function* () {
      const handlers: Operation.WithHandler<Operation.Definition.Any>[] = [];
      const invoker = OperationInvoker.make(() => Effect.succeed(handlers), testRuntime);

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
      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler]), testRuntime);

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
      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler]), testRuntime);

      // Fork both operations concurrently.
      const fiberA = yield* Effect.fork(invoker.invoke(Compute, { value: 5 }));
      const fiberB = yield* Effect.fork(invoker.invoke(Compute, { value: 2 }));

      // Advance clock enough for both (max is 5 * 10ms = 50ms).
      yield* TestClock.adjust('50 millis');

      const [a, b] = yield* Fiber.join(Fiber.zip(fiberA, fiberB));
      expect(b.value - a.value).toBe(-6);
    }),
  );

  it.effect('non-struct inputs & outputs', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([addHandler]), testRuntime);
      const result = yield* invoker.invoke(Add, [1, 1]);

      expect(result).toBe(2);
    }),
  );

  it.effect('empty inputs & outputs', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([sideEffectHandler]), testRuntime);
      const result = yield* invoker.invoke(SideEffect);

      expect(result).toBe(undefined);
    }),
  );

  it.effect('invocations pubsub receives events', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]), testRuntime);
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

describe('OperationInvoker.invokePromise', () => {
  test('invokes operation and returns result', async ({ expect }) => {
    const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]), testRuntime);
    const result = await invoker.invokePromise(ToString, { value: 42 });

    expect(result.error).toBeUndefined();
    expect(result.data?.string).toBe('42');
  });

  test('returns error for missing handler', async ({ expect }) => {
    const invoker = OperationInvoker.make(() => Effect.succeed([]), testRuntime);
    const result = await invoker.invokePromise(ToString, { value: 42 });

    expect(result.error).toBeDefined();
    expect(result.error).toBeInstanceOf(NoHandlerError);
  });
});

//
// Type-level tests for Operation.withHandler service constraints.
//

describe('Operation.withHandler type safety', () => {
  test('handler using undeclared service is a type error', () => {
    class DeclaredService extends Context.Tag('@test/DeclaredService')<DeclaredService, { declared: () => void }>() {}
    class UndeclaredService extends Context.Tag('@test/UndeclaredService')<
      UndeclaredService,
      { undeclared: () => void }
    >() {}

    const opWithDeclaredService = Operation.make({
      input: Schema.Void,
      output: Schema.Void,
      meta: { key: 'test.declared-service' },
      services: [DeclaredService],
    });

    // Using the declared service is allowed.
    Operation.withHandler(opWithDeclaredService, (_input) =>
      Effect.gen(function* () {
        yield* DeclaredService;
      }),
    );

    // Using an undeclared service should be a type error.
    Operation.withHandler(opWithDeclaredService, (_input) =>
      // @ts-expect-error - UndeclaredService is not in the operation's services
      Effect.gen(function* () {
        yield* UndeclaredService;
      }),
    );

    // Operation.Service is always available to handlers without declaring it.
    Operation.withHandler(opWithDeclaredService, (_input) =>
      Effect.gen(function* () {
        yield* Operation.schedule(SideEffect);
      }),
    );
  });
});
