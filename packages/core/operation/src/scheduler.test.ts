//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Schema from 'effect/Schema';
import { describe, expect } from 'vitest';

import * as Operation from './Operation';
import * as OperationInvoker from './OperationInvoker';
import * as Scheduler from './scheduler';

const testRuntime = ManagedRuntime.make(Layer.empty) as unknown as ManagedRuntime.ManagedRuntime<any, any>;

//
// Test Operations for Scheduler
//

const CountOp = Operation.make({
  input: Schema.Struct({ id: Schema.String }),
  output: Schema.Void,
  meta: { key: 'test.count' },
});

const SideEffect = Operation.make({
  input: Schema.Void,
  output: Schema.Void,
  meta: { key: 'test.side-effect' },
});

const TriggerWithFollowup = Operation.make({
  input: Schema.Struct({ id: Schema.String }),
  output: Schema.Struct({ triggered: Schema.Boolean }),
  meta: { key: 'test.trigger-with-followup' },
});

describe('Scheduler', () => {
  describe('standalone (without invoker)', () => {
    it.effect('tracks scheduled operations', () =>
      Effect.gen(function* () {
        const executed: string[] = [];
        const invokeFn = ((_op: any, input: { id: string }) =>
          Effect.sync(() => {
            executed.push(input.id);
            return undefined as any;
          })) as Scheduler.InvokeFn;

        const scheduler = Scheduler.make(invokeFn);

        // Initially no pending.
        expect(yield* scheduler.pending).toBe(0);

        // Schedule an operation.
        yield* scheduler.schedule(CountOp, { id: 'a' });

        // Should be pending initially (daemon fiber not yet completed).
        // Give it a tick to execute.
        yield* Effect.yieldNow();

        // After yielding, the sync effect should have completed.
        expect(executed).toContain('a');

        // Wait for all followups to complete.
        yield* scheduler.awaitAll;
        expect(yield* scheduler.pending).toBe(0);
      }),
    );

    it.effect('tracks multiple scheduled operations', () =>
      Effect.gen(function* () {
        const executed: string[] = [];
        const invokeFn = ((_op: any, input: { id: string }) =>
          Effect.sync(() => {
            executed.push(input.id);
            return undefined as any;
          })) as Scheduler.InvokeFn;

        const scheduler = Scheduler.make(invokeFn);

        yield* scheduler.schedule(CountOp, { id: 'a' });
        yield* scheduler.schedule(CountOp, { id: 'b' });
        yield* scheduler.schedule(CountOp, { id: 'c' });

        // Let them execute.
        yield* Effect.yieldNow();

        yield* scheduler.awaitAll;

        expect(executed).toHaveLength(3);
        expect(executed).toContain('a');
        expect(executed).toContain('b');
        expect(executed).toContain('c');
        expect(yield* scheduler.pending).toBe(0);
      }),
    );

    it.effect('schedules arbitrary effects', () =>
      Effect.gen(function* () {
        let executed = false;
        const invokeFn = (() => Effect.succeed(undefined as any)) as Scheduler.InvokeFn;

        const scheduler = Scheduler.make(invokeFn);

        yield* scheduler.scheduleEffect(
          Effect.sync(() => {
            executed = true;
          }),
        );

        yield* Effect.yieldNow();
        yield* scheduler.awaitAll;

        expect(executed).toBe(true);
      }),
    );

    it.effect('handles errors in followups gracefully', () =>
      Effect.gen(function* () {
        const executed: string[] = [];
        const invokeFn = ((_op: any, input: { id: string }) =>
          Effect.gen(function* () {
            executed.push(input.id);
            if (input.id === 'b') {
              return yield* Effect.fail(new Error('Intentional error'));
            }
            return undefined as any;
          })) as Scheduler.InvokeFn;

        const scheduler = Scheduler.make(invokeFn);

        yield* scheduler.schedule(CountOp, { id: 'a' });
        yield* scheduler.schedule(CountOp, { id: 'b' }); // This one will fail.
        yield* scheduler.schedule(CountOp, { id: 'c' });

        yield* Effect.yieldNow();
        yield* scheduler.awaitAll;

        // All should have been attempted.
        expect(executed).toHaveLength(3);
        // No pending after await (even the failed one is tracked and completed).
        expect(yield* scheduler.pending).toBe(0);
      }),
    );

    it.effect('awaitAll waits for async operations', () =>
      Effect.gen(function* () {
        const executed: string[] = [];
        const deferred = yield* Deferred.make<void>();

        const invokeFn = ((_op: any, input: { id: string }) =>
          Effect.gen(function* () {
            if (input.id === 'slow') {
              yield* Deferred.await(deferred);
            }
            executed.push(input.id);
            return undefined as any;
          })) as Scheduler.InvokeFn;

        const scheduler = Scheduler.make(invokeFn);

        yield* scheduler.schedule(CountOp, { id: 'fast' });
        yield* scheduler.schedule(CountOp, { id: 'slow' });

        // Fast one should execute quickly.
        yield* Effect.yieldNow();
        expect(executed).toContain('fast');
        expect(executed).not.toContain('slow');

        // Complete the slow one.
        yield* Deferred.succeed(deferred, undefined);

        yield* scheduler.awaitAll;

        expect(executed).toContain('slow');
        expect(yield* scheduler.pending).toBe(0);
      }),
    );
  });

  describe('integrated with OperationInvoker', () => {
    it.effect('handler can schedule followups via Operation.Service', () =>
      Effect.gen(function* () {
        const followupExecuted: string[] = [];

        const countHandler = Operation.withHandler(CountOp, (input) =>
          Effect.sync(() => {
            followupExecuted.push(input.id);
            return undefined;
          }),
        );

        const triggerHandler = Operation.withHandler(TriggerWithFollowup, (input) =>
          Effect.gen(function* () {
            yield* Operation.schedule(CountOp, { id: `followup-${input.id}` });
            return { triggered: true };
          }),
        );

        const invoker = OperationInvoker.make(() => Effect.succeed([countHandler, triggerHandler]), testRuntime);

        // Invoke the trigger operation.
        const result = yield* invoker.invoke(TriggerWithFollowup, { id: 'test' });

        expect(result.triggered).toBe(true);

        // Wait for followups.
        yield* invoker.awaitFollowups;

        expect(followupExecuted).toContain('followup-test');
      }),
    );

    it.effect('pendingFollowups reflects scheduled count', () =>
      Effect.gen(function* () {
        const deferred = yield* Deferred.make<void>();

        const slowHandler = Operation.withHandler(CountOp, () =>
          Effect.gen(function* () {
            yield* Deferred.await(deferred);
            return undefined;
          }),
        );

        const triggerHandler = Operation.withHandler(TriggerWithFollowup, (input) =>
          Effect.gen(function* () {
            yield* Operation.schedule(CountOp, { id: input.id });
            return { triggered: true };
          }),
        );

        const invoker = OperationInvoker.make(() => Effect.succeed([slowHandler, triggerHandler]), testRuntime);

        // Trigger a followup.
        yield* invoker.invoke(TriggerWithFollowup, { id: 'slow' });

        // Should have 1 pending.
        expect(yield* invoker.pendingFollowups).toBe(1);

        // Complete the slow operation.
        yield* Deferred.succeed(deferred, undefined);
        yield* invoker.awaitFollowups;

        expect(yield* invoker.pendingFollowups).toBe(0);
      }),
    );

    it.effect('followups survive parent operation completion', () =>
      Effect.gen(function* () {
        const followupDeferred = yield* Deferred.make<void>();
        const followupCompleted = yield* Deferred.make<void>();

        const countHandler = Operation.withHandler(CountOp, () =>
          Effect.gen(function* () {
            yield* Deferred.await(followupDeferred);
            yield* Deferred.succeed(followupCompleted, undefined);
            return undefined;
          }),
        );

        const triggerHandler = Operation.withHandler(TriggerWithFollowup, () =>
          Effect.gen(function* () {
            yield* Operation.schedule(CountOp, { id: 'child' });
            return { triggered: true };
          }),
        );

        const invoker = OperationInvoker.make(() => Effect.succeed([countHandler, triggerHandler]), testRuntime);

        // Trigger and wait for the main operation to complete.
        const result = yield* invoker.invoke(TriggerWithFollowup, { id: 'parent' });
        expect(result.triggered).toBe(true);

        // Followup should still be pending.
        expect(yield* invoker.pendingFollowups).toBe(1);

        // Let the followup complete.
        yield* Deferred.succeed(followupDeferred, undefined);

        // Wait for the followup completion signal.
        yield* Deferred.await(followupCompleted);

        // Now pending should be 0.
        yield* invoker.awaitFollowups;
        expect(yield* invoker.pendingFollowups).toBe(0);
      }),
    );

    it.effect('multiple handlers can schedule followups independently', () =>
      Effect.gen(function* () {
        const followupsExecuted: string[] = [];

        const countHandler = Operation.withHandler(CountOp, (input) =>
          Effect.sync(() => {
            followupsExecuted.push(input.id);
            return undefined;
          }),
        );

        const sideEffectWithFollowup = Operation.withHandler(SideEffect, () =>
          Effect.gen(function* () {
            yield* Operation.schedule(CountOp, { id: 'from-side-effect' });
            return undefined;
          }),
        );

        const triggerHandler = Operation.withHandler(TriggerWithFollowup, (input) =>
          Effect.gen(function* () {
            yield* Operation.schedule(CountOp, { id: `from-trigger-${input.id}` });
            return { triggered: true };
          }),
        );

        const invoker = OperationInvoker.make(
          () => Effect.succeed([countHandler, sideEffectWithFollowup, triggerHandler]),
          testRuntime,
        );

        // Invoke both operations.
        yield* invoker.invoke(SideEffect);
        yield* invoker.invoke(TriggerWithFollowup, { id: 'test' });

        yield* invoker.awaitFollowups;

        expect(followupsExecuted).toContain('from-side-effect');
        expect(followupsExecuted).toContain('from-trigger-test');
      }),
    );
  });
});
