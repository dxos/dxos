//
// Copyright 2025 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Ref from 'effect/Ref';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { Operation, type OperationInvoker, OperationResolver } from '@dxos/operation';

//
// Test Operations
//

export const Compute = Operation.make({
  schema: {
    input: Schema.Struct({ value: Schema.Number }),
    output: Schema.Struct({ value: Schema.Number }),
  },
  meta: { key: 'test.compute' },
});

export const HalveCompute = Operation.make({
  schema: {
    input: Schema.Struct({ value: Schema.Number }),
    output: Schema.Struct({ value: Schema.Number }),
  },
  meta: { key: 'test.halve-compute' },
});

export const ToString = Operation.make({
  schema: {
    input: Schema.Struct({ value: Schema.Number }),
    output: Schema.Struct({ string: Schema.String }),
  },
  meta: { key: 'test.to-string' },
});

export const Add = Operation.make({
  schema: {
    input: Schema.Tuple(Schema.Number, Schema.Number),
    output: Schema.Number,
  },
  meta: { key: 'test.add' },
});

export const SideEffect = Operation.make({
  schema: {
    input: Schema.Void,
    output: Schema.Void,
  },
  meta: { key: 'test.side-effect' },
});

//
// Test Handlers
//

export const computeHandler = OperationResolver.make({
  operation: Compute,
  handler: (data) =>
    Effect.gen(function* () {
      yield* Effect.sleep(data.value * 10);
      return { value: data.value * 2 };
    }),
});

export const halveComputeHandler = OperationResolver.make({
  operation: HalveCompute,
  handler: (data) => Effect.succeed({ value: data.value / 2 }),
});

export const toStringHandler = OperationResolver.make({
  operation: ToString,
  handler: (data) => Effect.succeed({ string: data.value.toString() }),
});

export const addHandler = OperationResolver.make({
  operation: Add,
  handler: (data) => Effect.succeed(data[0] + data[1]),
});

export const sideEffectHandler = OperationResolver.make({
  operation: SideEffect,
  handler: () => Effect.succeed(undefined),
});

//
// Test Utilities
//

/**
 * Event collector for testing - provides deterministic event collection using Effect primitives.
 */
export interface EventCollector {
  /** All collected events. */
  readonly events: OperationInvoker.InvocationEvent[];
  /** Wait until N events have been collected. */
  waitForEvents: (count: number) => Effect.Effect<void>;
  /** Clean up the subscription fiber. */
  dispose: Effect.Effect<void>;
}

/**
 * Creates an event collector that subscribes to invoker events.
 * Uses Effect primitives for synchronization.
 */
export const createEventCollector = (invoker: OperationInvoker.OperationInvoker): Effect.Effect<EventCollector> =>
  Effect.gen(function* () {
    const events: OperationInvoker.InvocationEvent[] = [];

    // Ref to track current waiter (waiting for N events).
    const waiterRef = yield* Ref.make<{ count: number; deferred: Deferred.Deferred<void> } | null>(null);

    // Deferred to signal when subscription is ready.
    const subscriptionReady = yield* Deferred.make<void>();

    const checkWaiter = Effect.gen(function* () {
      const waiter = yield* Ref.get(waiterRef);
      if (waiter && events.length >= waiter.count) {
        yield* Deferred.succeed(waiter.deferred, undefined);
        yield* Ref.set(waiterRef, null);
      }
    });

    // Fork a fiber to consume the invocation stream.
    const fiber = yield* Effect.fork(
      Effect.gen(function* () {
        // Signal that subscription is about to start.
        yield* Deferred.succeed(subscriptionReady, undefined);
        yield* Stream.fromPubSub(invoker.invocations).pipe(
          Stream.runForEach((event) =>
            Effect.gen(function* () {
              events.push(event);
              yield* checkWaiter;
            }),
          ),
        );
      }),
    );

    // Wait for the subscription to be established.
    yield* Deferred.await(subscriptionReady);
    // Additional yield to ensure PubSub subscription is fully registered.
    yield* Effect.yieldNow();

    const waitForEvents = (count: number): Effect.Effect<void> =>
      Effect.gen(function* () {
        if (events.length >= count) {
          return;
        }
        const deferred = yield* Deferred.make<void>();
        yield* Ref.set(waiterRef, { count, deferred });
        yield* Deferred.await(deferred);
      });

    const dispose = Fiber.interrupt(fiber);

    return { events, waitForEvents, dispose };
  });

/**
 * Waits until a condition is true, yielding to the JS event loop between checks.
 * Uses setImmediate to allow other async work to complete.
 */
export const waitUntil = (condition: () => boolean): Effect.Effect<void> =>
  Effect.gen(function* () {
    while (!condition()) {
      yield* Effect.promise(() => new Promise((r) => setImmediate(r)));
    }
  });
