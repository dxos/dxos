//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, expect } from 'vitest';

import * as Operation from '@dxos/operation';

import { SideEffect } from '../testing';

import * as FollowupScheduler from './followup-scheduler';
import * as OperationInvoker from './operation-invoker';

//
// Test Operations for FollowupScheduler
//

const CountOp = Operation.make({
  schema: {
    input: Schema.Struct({ id: Schema.String }),
    output: Schema.Void,
  },
  meta: { key: 'test.count' },
});

const TriggerWithFollowup = Operation.make({
  schema: {
    input: Schema.Struct({ id: Schema.String }),
    output: Schema.Struct({ triggered: Schema.Boolean }),
  },
  meta: { key: 'test.trigger-with-followup' },
});

describe('FollowupScheduler', () => {
  describe('standalone (without invoker)', () => {
    it.effect('tracks scheduled operations', () =>
      Effect.gen(function* () {
        const executed: string[] = [];
        const invokeFn = ((_op: any, input: { id: string }) =>
          Effect.sync(() => {
            executed.push(input.id);
            return undefined as any;
          })) as FollowupScheduler.InvokeFn;

        const scheduler = FollowupScheduler.make(invokeFn);

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
          })) as FollowupScheduler.InvokeFn;

        const scheduler = FollowupScheduler.make(invokeFn);

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
        const invokeFn = (() => Effect.succeed(undefined as any)) as FollowupScheduler.InvokeFn;

        const scheduler = FollowupScheduler.make(invokeFn);

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
          })) as FollowupScheduler.InvokeFn;

        const scheduler = FollowupScheduler.make(invokeFn);

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
          })) as FollowupScheduler.InvokeFn;

        const scheduler = FollowupScheduler.make(invokeFn);

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
    it.effect('handler can access FollowupScheduler via service', () =>
      Effect.gen(function* () {
        const followupExecuted: string[] = [];

        const countHandler = {
          operation: CountOp,
          handler: (input: { id: string }) =>
            Effect.sync(() => {
              followupExecuted.push(input.id);
              return undefined;
            }),
        };

        const triggerHandler = {
          operation: TriggerWithFollowup,
          handler: (input: { id: string }) =>
            Effect.gen(function* () {
              const scheduler = yield* FollowupScheduler.Service;
              yield* scheduler.schedule(CountOp, { id: `followup-${input.id}` });
              return { triggered: true };
            }),
        };

        const invoker = OperationInvoker.make(() => Effect.succeed([countHandler, triggerHandler]));

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

        const slowHandler = {
          operation: CountOp,
          handler: () =>
            Effect.gen(function* () {
              yield* Deferred.await(deferred);
              return undefined;
            }),
        };

        const triggerHandler = {
          operation: TriggerWithFollowup,
          handler: (input: { id: string }) =>
            Effect.gen(function* () {
              const scheduler = yield* FollowupScheduler.Service;
              yield* scheduler.schedule(CountOp, { id: input.id });
              return { triggered: true };
            }),
        };

        const invoker = OperationInvoker.make(() => Effect.succeed([slowHandler, triggerHandler]));

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

        const countHandler = {
          operation: CountOp,
          handler: () =>
            Effect.gen(function* () {
              yield* Deferred.await(followupDeferred);
              yield* Deferred.succeed(followupCompleted, undefined);
              return undefined;
            }),
        };

        const triggerHandler = {
          operation: TriggerWithFollowup,
          handler: () =>
            Effect.gen(function* () {
              const scheduler = yield* FollowupScheduler.Service;
              yield* scheduler.schedule(CountOp, { id: 'child' });
              // Return immediately, before the followup completes.
              return { triggered: true };
            }),
        };

        const invoker = OperationInvoker.make(() => Effect.succeed([countHandler, triggerHandler]));

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

        const countHandler = {
          operation: CountOp,
          handler: (input: { id: string }) =>
            Effect.sync(() => {
              followupsExecuted.push(input.id);
              return undefined;
            }),
        };

        const sideEffectWithFollowup = {
          operation: SideEffect,
          handler: () =>
            Effect.gen(function* () {
              const scheduler = yield* FollowupScheduler.Service;
              yield* scheduler.schedule(CountOp, { id: 'from-side-effect' });
              return undefined;
            }),
        };

        const triggerHandler = {
          operation: TriggerWithFollowup,
          handler: (input: { id: string }) =>
            Effect.gen(function* () {
              const scheduler = yield* FollowupScheduler.Service;
              yield* scheduler.schedule(CountOp, { id: `from-trigger-${input.id}` });
              return { triggered: true };
            }),
        };

        const invoker = OperationInvoker.make(() =>
          Effect.succeed([countHandler, sideEffectWithFollowup, triggerHandler]),
        );

        // Invoke both operations.
        yield* invoker.invoke(SideEffect, undefined);
        yield* invoker.invoke(TriggerWithFollowup, { id: 'test' });

        yield* invoker.awaitFollowups;

        expect(followupsExecuted).toContain('from-side-effect');
        expect(followupsExecuted).toContain('from-trigger-test');
      }),
    );
  });
});
