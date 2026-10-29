//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as PubSub from 'effect/PubSub';
import * as Schema from 'effect/Schema';
import * as TestClock from 'effect/testing/TestClock';
import { afterEach, beforeEach, describe, expect, vi } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';
import { OperationInvoker } from '@dxos/operation';

const testRuntime = ManagedRuntime.make(Layer.empty) as unknown as ManagedRuntime.ManagedRuntime<any, any>;

import {
  Compute,
  HalveCompute,
  ToString,
  computeHandler,
  createEventCollector,
  halveComputeHandler,
  toStringHandler,
  waitUntil,
} from '../testing.ts';
import { EmptyFutureError, EmptyHistoryError } from './errors.ts';
import * as HistoryTracker from './history-tracker.ts';
import * as UndoMapping from './undo-mapping.ts';
import * as UndoRegistry from './undo-registry.ts';

describe('HistoryTracker', () => {
  it.effect('tracks undoable operations', () =>
    Effect.gen(function* () {
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      });

      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler, halveComputeHandler]), testRuntime);
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make(invoker, undoRegistry);

      expect(tracker.canUndo()).toBe(false);

      // Fork compute operation and advance clock.
      const fiber = yield* Effect.forkChild(invoker.invoke(Compute, { value: 2 }));
      yield* TestClock.adjust('20 millis');
      yield* Fiber.join(fiber);

      // Wait until the tracker has processed the event.
      yield* waitUntil(() => tracker.canUndo());

      expect(tracker.canUndo()).toBe(true);
    }),
  );

  it.effect('does not track operations without undo mapping', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]), testRuntime);
      const undoRegistry = UndoRegistry.make(() => []);
      const tracker = HistoryTracker.make(invoker, undoRegistry);
      const collector = yield* createEventCollector(invoker);

      yield* invoker.invoke(ToString, { value: 42 });

      // Wait for the pending + success events to be processed.
      yield* collector.waitForEvents(1);

      // Without an undo mapping, canUndo should remain false.
      expect(tracker.canUndo()).toBe(false);

      yield* collector.dispose;
    }),
  );

  it.effect('undo invokes inverse operation', () =>
    Effect.gen(function* () {
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      });

      let halveWasCalled = false;
      const trackingHalveHandler = Operation.withHandler(HalveCompute, (data) => {
        halveWasCalled = true;
        return Effect.succeed({ value: data.value / 2 });
      });

      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler, trackingHalveHandler]), testRuntime);
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make(invoker, undoRegistry);

      // Fork compute operation: 2 * 2 = 4.
      const fiber = yield* Effect.forkChild(invoker.invoke(Compute, { value: 2 }));
      yield* TestClock.adjust('20 millis');
      yield* Fiber.join(fiber);

      // Wait until the tracker has processed the event.
      yield* waitUntil(() => tracker.canUndo());
      expect(tracker.canUndo()).toBe(true);

      // Undo should invoke halve with { value: 4 }.
      yield* tracker.undo();
      expect(halveWasCalled).toBe(true);
      expect(tracker.canUndo()).toBe(false);
    }),
  );

  it.effect('undo uses _invokeCore to skip event emission', () =>
    Effect.gen(function* () {
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      });

      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler, halveComputeHandler]), testRuntime);
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make(invoker, undoRegistry);
      const collector = yield* createEventCollector(invoker);

      // Fork compute operation (emits one success event).
      const fiber = yield* Effect.forkChild(invoker.invoke(Compute, { value: 2 }));
      yield* TestClock.adjust('20 millis');
      yield* Fiber.join(fiber);

      yield* collector.waitForEvents(1);
      expect(collector.events.length).toBe(1);

      // Wait until the tracker has processed the event.
      yield* waitUntil(() => tracker.canUndo());

      // Undo (should NOT emit events because it uses _invokeCore).
      yield* tracker.undo();

      // Verify no new events were emitted.
      expect(collector.events.length).toBe(1);

      yield* collector.dispose;
    }),
  );

  it.effect('multiple undos work in LIFO order', () =>
    Effect.gen(function* () {
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      });

      const halveInputs: number[] = [];
      const trackingHalveHandler = Operation.withHandler(HalveCompute, (data) => {
        halveInputs.push(data.value);
        return Effect.succeed({ value: data.value / 2 });
      });

      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler, trackingHalveHandler]), testRuntime);
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make(invoker, undoRegistry);
      const collector = yield* createEventCollector(invoker);

      // Fork compute with 2 -> 4.
      const fiber1 = yield* Effect.forkChild(invoker.invoke(Compute, { value: 2 }));
      yield* TestClock.adjust('20 millis');
      yield* Fiber.join(fiber1);

      // Fork compute with 3 -> 6.
      const fiber2 = yield* Effect.forkChild(invoker.invoke(Compute, { value: 3 }));
      yield* TestClock.adjust('30 millis');
      yield* Fiber.join(fiber2);

      // Each invoke emits one success event.
      yield* collector.waitForEvents(2);

      // First undo should halve 6 (the output of the second compute).
      yield* tracker.undo();
      expect(halveInputs[0]).toBe(6);

      // Second undo should halve 4 (the output of the first compute).
      yield* tracker.undo();
      expect(halveInputs[1]).toBe(4);

      expect(tracker.canUndo()).toBe(false);

      yield* collector.dispose;
    }),
  );

  it.effect('undo on empty history returns error', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([]), testRuntime);
      const tracker = HistoryTracker.make(
        invoker,
        UndoRegistry.make(() => []),
      );

      const result = yield* tracker.undo().pipe(Effect.result);
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        expect(result.failure.message).toContain('empty');
      }
    }),
  );

  it.effect('publishes an undoable event with the resolved message', () =>
    Effect.gen(function* () {
      const testMessage: [string, { ns: string }] = ['test-undo.message', { ns: 'test' }];
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
        message: testMessage,
      });

      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler, halveComputeHandler]), testRuntime);
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make(invoker, undoRegistry);

      yield* Effect.scoped(
        Effect.gen(function* () {
          const undoables = yield* PubSub.subscribe(tracker.undoable);

          // Fork compute operation and advance clock.
          const fiber = yield* Effect.forkChild(invoker.invoke(Compute, { value: 2 }));
          yield* TestClock.adjust('20 millis');
          yield* Fiber.join(fiber);

          const undoable = yield* PubSub.take(undoables);
          expect(undoable.message).toEqual(testMessage);
        }),
      );
      expect(tracker.canUndo()).toBe(true);
    }),
  );

  it.effect('a mapping with toast off marks its undoable events so the UI raises no toast', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler, halveComputeHandler]), testRuntime);
      const tracker = HistoryTracker.make(
        invoker,
        UndoRegistry.make(() => [
          UndoMapping.make({
            operation: Compute,
            inverse: HalveCompute,
            deriveContext: (_input, output) => ({ value: output.value }),
            toast: false,
          }),
        ]),
      );

      yield* Effect.scoped(
        Effect.gen(function* () {
          const undoables = yield* PubSub.subscribe(tracker.undoable);
          const fiber = yield* Effect.forkChild(invoker.invoke(Compute, { value: 2 }));
          yield* TestClock.adjust('20 millis');
          yield* Fiber.join(fiber);
          expect((yield* PubSub.take(undoables)).toast).toBe(false);
        }),
      );
      expect(tracker.canUndo()).toBe(true);
    }),
  );

  it.effect('undo message can be derived from input and output', () =>
    Effect.gen(function* () {
      // Dynamic message that depends on input/output.
      const dynamicMessage = (input: { value: number }, output: { value: number }): [string, { ns: string }] => [
        `computed-${input.value}-to-${output.value}`,
        { ns: 'test' },
      ];
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
        message: dynamicMessage,
      });

      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler, halveComputeHandler]), testRuntime);
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make(invoker, undoRegistry);

      yield* Effect.scoped(
        Effect.gen(function* () {
          const undoables = yield* PubSub.subscribe(tracker.undoable);

          // Fork compute operation and advance clock (2 * 2 = 4).
          const fiber = yield* Effect.forkChild(invoker.invoke(Compute, { value: 2 }));
          yield* TestClock.adjust('20 millis');
          yield* Fiber.join(fiber);

          const undoable = yield* PubSub.take(undoables);
          expect(undoable.message).toEqual(['computed-2-to-4', { ns: 'test' }]);
        }),
      );
    }),
  );

  it.effect('does not track operations when deriveContext returns undefined', () =>
    Effect.gen(function* () {
      // Undo mapping that conditionally returns undefined to indicate not undoable.
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => {
          // Return undefined for values less than 10 to indicate not undoable.
          if (output.value < 10) {
            return undefined;
          }
          return { value: output.value };
        },
      });

      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler, halveComputeHandler]), testRuntime);
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make(invoker, undoRegistry);
      const collector = yield* createEventCollector(invoker);

      expect(tracker.canUndo()).toBe(false);

      // Compute 2 * 2 = 4, which is < 10, so deriveContext returns undefined.
      const fiber = yield* Effect.forkChild(invoker.invoke(Compute, { value: 2 }));
      yield* TestClock.adjust('20 millis');
      yield* Fiber.join(fiber);

      // Wait for the pending + success events to be processed.
      yield* collector.waitForEvents(1);

      // Even though there's an undo mapping, deriveContext returned undefined,
      // so this operation should not be tracked as undoable.
      expect(tracker.canUndo()).toBe(false);

      yield* collector.dispose;
    }),
  );

  it.effect('tracks operations when deriveContext returns a value', () =>
    Effect.gen(function* () {
      // Undo mapping that conditionally returns undefined to indicate not undoable.
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => {
          // Return undefined for values less than 10 to indicate not undoable.
          if (output.value < 10) {
            return undefined;
          }
          return { value: output.value };
        },
      });

      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler, halveComputeHandler]), testRuntime);
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make(invoker, undoRegistry);
      const collector = yield* createEventCollector(invoker);

      expect(tracker.canUndo()).toBe(false);

      // Compute 5 * 2 = 10, which is >= 10, so deriveContext returns a value.
      // Handler sleeps for value * 10 = 50ms.
      const fiber = yield* Effect.forkChild(invoker.invoke(Compute, { value: 5 }));
      yield* TestClock.adjust('50 millis');
      yield* Fiber.join(fiber);

      // Wait for the pending + success events to be processed.
      yield* collector.waitForEvents(1);

      // Wait until the tracker has processed the event.
      yield* waitUntil(() => tracker.canUndo());

      // This operation should be tracked as undoable.
      expect(tracker.canUndo()).toBe(true);

      yield* collector.dispose;
    }),
  );
});

//
// Undo/redo evolution: redo, scopes, transactions, merging, context.
//

/** Sets one field of one document; its own inverse, so undo and redo exercise the same handler. */
const SetField = Operation.make({
  input: Schema.Struct({
    doc: Schema.String,
    field: Schema.String,
    value: Schema.Number,
    selection: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({ previous: Schema.Number }),
  meta: { key: DXN.make('com.example.operation.test.setField') },
});

const Fail = Operation.make({
  input: Schema.Void,
  output: Schema.Void,
  meta: { key: DXN.make('com.example.operation.test.fail') },
});

const setup = (options?: HistoryTracker.HistoryTrackerOptions) => {
  const store = new Map<string, number>();
  const writes: string[] = [];
  // Counts tracker lookups so tests can wait for the asynchronous consumer deterministically.
  const counter = { processed: 0 };
  const hooks: { onWrite?: () => void; failOn?: string } = {};

  const setFieldHandler = Operation.withHandler(SetField, ({ doc, field, value }) =>
    Effect.suspend(() => {
      const key = `${doc}.${field}`;
      if (key === hooks.failOn) {
        return Effect.die(new Error(`write to ${key} failed`));
      }
      const previous = store.get(key) ?? 0;
      store.set(key, value);
      writes.push(`${key}=${value}`);
      hooks.onWrite?.();
      return Effect.succeed({ previous });
    }),
  );
  const failHandler = Operation.withHandler(Fail, () => Effect.die(new Error('fail')));

  const undoMapping = UndoMapping.make({
    operation: SetField,
    inverse: SetField,
    deriveContext: (input, output) => {
      counter.processed++;
      return { doc: input.doc, field: input.field, value: output.previous };
    },
    scope: (input) => input.doc,
    mergeKey: (input) => `${input.doc}.${input.field}`,
    context: (input) => input.selection,
    message: (input) => `set ${input.field}`,
  });

  const invoker = OperationInvoker.make(() => Effect.succeed([setFieldHandler, failHandler]), testRuntime);
  const tracker = HistoryTracker.make(
    invoker,
    UndoRegistry.make(() => [undoMapping]),
    options,
  );

  const get = (doc: string, field: string) => store.get(`${doc}.${field}`) ?? 0;

  // Invokes outside any transaction and waits until the tracker has processed the event.
  const set = (doc: string, field: string, value: number, selection?: string) =>
    Effect.gen(function* () {
      const before = counter.processed;
      yield* invoker.invoke(SetField, { doc, field, value, selection });
      yield* waitUntil(() => counter.processed > before);
    });

  return { invoker, tracker, store, writes, counter, hooks, get, set };
};

describe('HistoryTracker redo', () => {
  it.effect('redo re-invokes the forward operation and derives a fresh inverse', () =>
    Effect.gen(function* () {
      const { tracker, get, set } = setup();
      yield* set('a', 'x', 1);
      expect(tracker.canRedo()).toBe(false);

      yield* tracker.undo();
      expect(get('a', 'x')).toBe(0);
      expect(tracker.canUndo()).toBe(false);
      expect(tracker.canRedo()).toBe(true);

      yield* tracker.redo();
      expect(get('a', 'x')).toBe(1);
      expect(tracker.canUndo()).toBe(true);
      expect(tracker.canRedo()).toBe(false);

      yield* tracker.undo();
      expect(get('a', 'x')).toBe(0);
    }),
  );

  it.effect('recording a new entry clears the redo stack', () =>
    Effect.gen(function* () {
      const { tracker, set } = setup({ mergeWindow: -1 });
      yield* set('a', 'x', 1);
      yield* set('a', 'y', 2);
      yield* tracker.undo();
      expect(tracker.canRedo()).toBe(true);

      yield* set('b', 'z', 3);
      expect(tracker.canRedo()).toBe(false);
      expect(tracker.canRedo('a')).toBe(false);
    }),
  );

  it.effect('redo on an empty future fails', () =>
    Effect.gen(function* () {
      const { tracker } = setup();
      const result = yield* tracker.redo().pipe(Effect.result);
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        expect(result.failure).toBeInstanceOf(EmptyFutureError);
      }
    }),
  );

  it.effect('a failed redo keeps the forwards that ran undoable', () =>
    Effect.gen(function* () {
      const { invoker, tracker, get, hooks } = setup();
      yield* tracker.transaction(
        'pair',
        Effect.gen(function* () {
          yield* invoker.invoke(SetField, { doc: 'a', field: 'x', value: 1 });
          yield* invoker.invoke(SetField, { doc: 'a', field: 'y', value: 2 });
        }),
      );
      yield* tracker.undo();

      hooks.failOn = 'a.y';
      const exit = yield* tracker.redo().pipe(Effect.exit);
      expect(exit._tag).toBe('Failure');
      expect(get('a', 'x')).toBe(1);
      expect(tracker.canUndo()).toBe(true);
      expect(tracker.canRedo()).toBe(false);

      hooks.failOn = undefined;
      yield* tracker.undo();
      expect(get('a', 'x')).toBe(0);
      expect(tracker.canUndo()).toBe(false);
    }),
  );

  it.effect('a failed undo keeps the undone tail redoable and the earlier steps undoable', () =>
    Effect.gen(function* () {
      const { invoker, tracker, get, hooks } = setup();
      yield* tracker.transaction(
        'triple',
        Effect.gen(function* () {
          yield* invoker.invoke(SetField, { doc: 'a', field: 'x', value: 1 });
          yield* invoker.invoke(SetField, { doc: 'a', field: 'y', value: 2 });
          yield* invoker.invoke(SetField, { doc: 'a', field: 'z', value: 3 });
        }),
      );

      hooks.failOn = 'a.y';
      const exit = yield* tracker.undo().pipe(Effect.exit);
      expect(exit._tag).toBe('Failure');
      expect(get('a', 'z')).toBe(0);
      hooks.failOn = undefined;

      expect(tracker.canUndo()).toBe(true);
      yield* tracker.undo();
      expect(get('a', 'x')).toBe(0);
      expect(get('a', 'y')).toBe(2);
      expect(tracker.canUndo()).toBe(false);

      // Redo order is most recent undo first: x, then the z tail from the failed undo.
      yield* tracker.redo();
      expect(get('a', 'x')).toBe(1);
      yield* tracker.redo();
      expect(get('a', 'z')).toBe(3);
      expect(tracker.canRedo()).toBe(false);
    }),
  );

  it.effect('a failed single-step undo drops the entry', () =>
    Effect.gen(function* () {
      const { tracker, hooks, set } = setup();
      yield* set('a', 'x', 1);
      hooks.failOn = 'a.x';
      const exit = yield* tracker.undo().pipe(Effect.exit);
      expect(exit._tag).toBe('Failure');
      expect(tracker.canUndo()).toBe(false);
      expect(tracker.canRedo()).toBe(false);
    }),
  );

  it.effect('undo and redo are not recorded as new invocations', () =>
    Effect.gen(function* () {
      const { invoker, tracker, set } = setup();
      const collector = yield* createEventCollector(invoker);
      yield* set('a', 'x', 1);
      yield* collector.waitForEvents(1);

      yield* tracker.undo();
      yield* tracker.redo();
      yield* tracker.undo();
      yield* tracker.redo();

      expect(collector.events.length).toBe(1);
      expect(tracker.canUndo()).toBe(true);
      expect(tracker.canRedo()).toBe(false);
      yield* collector.dispose;
    }),
  );
});

describe('HistoryTracker scopes', () => {
  it.effect('scoped undo and redo act only on their own scope', () =>
    Effect.gen(function* () {
      const { tracker, get, set } = setup();
      yield* set('a', 'x', 1);
      yield* set('b', 'x', 2);

      const result = yield* tracker.undo('a');
      expect(result.scope).toBe('a');
      expect(get('a', 'x')).toBe(0);
      expect(get('b', 'x')).toBe(2);

      expect(tracker.canUndo('a')).toBe(false);
      expect(tracker.canUndo('b')).toBe(true);
      expect(tracker.canRedo('a')).toBe(true);
      expect(tracker.canRedo('b')).toBe(false);

      yield* tracker.redo('a');
      expect(get('a', 'x')).toBe(1);
      expect(tracker.canRedo('a')).toBe(false);
    }),
  );

  it.effect('unscoped undo and redo act on the latest entry across scopes', () =>
    Effect.gen(function* () {
      const { tracker, get, set } = setup();
      yield* set('a', 'x', 1);
      yield* set('b', 'x', 2);

      expect((yield* tracker.undo()).scope).toBe('b');
      expect(get('b', 'x')).toBe(0);
      expect((yield* tracker.undo()).scope).toBe('a');
      expect(get('a', 'x')).toBe(0);

      expect((yield* tracker.redo()).scope).toBe('a');
      expect((yield* tracker.redo()).scope).toBe('b');
    }),
  );

  it.effect('scoped undo on an empty scope fails', () =>
    Effect.gen(function* () {
      const { tracker, set } = setup();
      yield* set('a', 'x', 1);
      const result = yield* tracker.undo('b').pipe(Effect.result);
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        expect(result.failure).toBeInstanceOf(EmptyHistoryError);
      }
      expect(tracker.canUndo('a')).toBe(true);
    }),
  );

  it.effect('the undoable event carries the scope', () =>
    Effect.gen(function* () {
      const { tracker, set } = setup();
      yield* Effect.scoped(
        Effect.gen(function* () {
          const undoables = yield* PubSub.subscribe(tracker.undoable);
          yield* set('a', 'x', 1);
          const event = yield* PubSub.take(undoables);
          expect(event).toEqual({ message: 'set x', scope: 'a' });
        }),
      );
    }),
  );
});

describe('HistoryTracker transactions', () => {
  it.effect('groups invocations into one entry undone in reverse and redone in order', () =>
    Effect.gen(function* () {
      const { invoker, tracker, get, writes } = setup();
      yield* tracker.transaction(
        'move',
        Effect.gen(function* () {
          yield* invoker.invoke(SetField, { doc: 'a', field: 'x', value: 1 });
          yield* invoker.invoke(SetField, { doc: 'a', field: 'y', value: 2 });
          yield* invoker.invoke(SetField, { doc: 'a', field: 'x', value: 3 });
        }),
      );

      expect(tracker.canUndo()).toBe(true);
      writes.length = 0;
      const result = yield* tracker.undo();
      expect(result).toMatchObject({ scope: 'a', message: 'move' });
      expect(writes).toEqual(['a.x=1', 'a.y=0', 'a.x=0']);
      expect(get('a', 'x')).toBe(0);
      expect(tracker.canUndo()).toBe(false);

      writes.length = 0;
      yield* tracker.redo();
      expect(writes).toEqual(['a.x=1', 'a.y=2', 'a.x=3']);

      writes.length = 0;
      yield* tracker.undo();
      expect(writes).toEqual(['a.x=1', 'a.y=0', 'a.x=0']);
    }),
  );

  it.effect('publishes one undoable event labelled by the transaction', () =>
    Effect.gen(function* () {
      const { invoker, tracker } = setup();
      yield* Effect.scoped(
        Effect.gen(function* () {
          const undoables = yield* PubSub.subscribe(tracker.undoable);
          yield* tracker.transaction(
            'group',
            Effect.gen(function* () {
              yield* invoker.invoke(SetField, { doc: 'a', field: 'x', value: 1 });
              yield* invoker.invoke(SetField, { doc: 'a', field: 'y', value: 1 });
            }),
          );
          // Let the consumer see (and skip) the claimed events before counting.
          yield* Effect.promise(() => new Promise((resolve) => setImmediate(resolve)));
          const events = yield* PubSub.takeAll(undoables);
          expect(events).toEqual([{ message: 'group', scope: 'a' }]);
        }),
      );
    }),
  );

  it.effect('scope is inferred when shared, unset when mixed, and overridable', () =>
    Effect.gen(function* () {
      const { invoker, tracker } = setup();
      yield* tracker.transaction(
        'mixed',
        Effect.gen(function* () {
          yield* invoker.invoke(SetField, { doc: 'a', field: 'x', value: 1 });
          yield* invoker.invoke(SetField, { doc: 'b', field: 'x', value: 1 });
        }),
      );
      expect(tracker.canUndo('a')).toBe(false);
      expect(tracker.canUndo('b')).toBe(false);
      expect(tracker.canUndo()).toBe(true);

      yield* tracker.transaction('explicit', invoker.invoke(SetField, { doc: 'a', field: 'y', value: 1 }), {
        scope: 'c',
        context: { view: 'v1' },
      });
      expect(tracker.canUndo('c')).toBe(true);
      expect(yield* tracker.undo('c')).toEqual({ scope: 'c', context: { view: 'v1' }, message: 'explicit' });
    }),
  );

  it.effect('nested transactions join the outer one', () =>
    Effect.gen(function* () {
      const { invoker, tracker, get } = setup();
      yield* tracker.transaction(
        'outer',
        Effect.gen(function* () {
          yield* invoker.invoke(SetField, { doc: 'a', field: 'x', value: 1 });
          yield* tracker.transaction('inner', invoker.invoke(SetField, { doc: 'a', field: 'y', value: 1 }));
        }),
      );

      expect((yield* tracker.undo()).message).toBe('outer');
      expect(get('a', 'x')).toBe(0);
      expect(get('a', 'y')).toBe(0);
      expect(tracker.canUndo()).toBe(false);
    }),
  );

  it.effect('records partial work when the transaction fails', () =>
    Effect.gen(function* () {
      const { invoker, tracker, get } = setup();
      const exit = yield* tracker
        .transaction(
          'partial',
          Effect.gen(function* () {
            yield* invoker.invoke(SetField, { doc: 'a', field: 'x', value: 1 });
            yield* invoker.invoke(Fail);
          }),
        )
        .pipe(Effect.exit);
      expect(exit._tag).toBe('Failure');

      expect(tracker.canUndo('a')).toBe(true);
      yield* tracker.undo('a');
      expect(get('a', 'x')).toBe(0);
    }),
  );

  it.effect('a transaction without undoable invocations records nothing', () =>
    Effect.gen(function* () {
      const { tracker } = setup();
      const value = yield* tracker.transaction('empty', Effect.succeed(42));
      expect(value).toBe(42);
      expect(tracker.canUndo()).toBe(false);
    }),
  );

  it.effect('invocations after a transaction are recorded separately', () =>
    Effect.gen(function* () {
      const { invoker, tracker, set } = setup({ mergeWindow: -1 });
      yield* tracker.transaction('first', invoker.invoke(SetField, { doc: 'a', field: 'x', value: 1 }));
      yield* set('a', 'y', 2);

      expect((yield* tracker.undo()).message).toBe('set y');
      expect((yield* tracker.undo()).message).toBe('first');
      expect(tracker.canUndo()).toBe(false);
    }),
  );
});

describe('HistoryTracker merging', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.effect('folds edits within the window, keeping the earliest inverse and the latest forward', () =>
    Effect.gen(function* () {
      const { tracker, get, set } = setup();
      yield* set('a', 'x', 1);
      vi.setSystemTime(300);
      yield* set('a', 'x', 2);
      // The window slides from the last edit, so 700 ms after the first edit still merges.
      vi.setSystemTime(700);
      yield* set('a', 'x', 3);

      yield* tracker.undo();
      expect(get('a', 'x')).toBe(0);
      expect(tracker.canUndo()).toBe(false);

      yield* tracker.redo();
      expect(get('a', 'x')).toBe(3);
    }),
  );

  it.effect('does not fold edits outside the window', () =>
    Effect.gen(function* () {
      const { tracker, get, set } = setup();
      yield* set('a', 'x', 1);
      vi.setSystemTime(501);
      yield* set('a', 'x', 2);

      yield* tracker.undo();
      expect(get('a', 'x')).toBe(1);
      expect(tracker.canUndo()).toBe(true);
    }),
  );

  it.effect('the window is configurable', () =>
    Effect.gen(function* () {
      const { tracker, get, set } = setup({ mergeWindow: 2_000 });
      yield* set('a', 'x', 1);
      vi.setSystemTime(1_500);
      yield* set('a', 'x', 2);

      yield* tracker.undo();
      expect(get('a', 'x')).toBe(0);
      expect(tracker.canUndo()).toBe(false);
    }),
  );

  it.effect('does not fold edits with a different merge key or scope', () =>
    Effect.gen(function* () {
      const { tracker, get, set } = setup();
      yield* set('a', 'x', 1);
      yield* set('a', 'y', 1);
      yield* set('a', 'x', 2);
      yield* set('b', 'x', 1);

      yield* tracker.undo('a');
      expect(get('a', 'x')).toBe(1);
      expect(tracker.canUndo('a')).toBe(true);
      expect(tracker.canUndo('b')).toBe(true);
    }),
  );

  it.effect('merges per scope across interleaved edits in other scopes', () =>
    Effect.gen(function* () {
      const { tracker, get, set } = setup();
      yield* set('a', 'x', 1);
      yield* set('b', 'x', 1);
      yield* set('a', 'x', 2);

      yield* tracker.undo('a');
      expect(get('a', 'x')).toBe(0);
      expect(tracker.canUndo('a')).toBe(false);
    }),
  );

  it.effect('does not fold into an entry that has been undone', () =>
    Effect.gen(function* () {
      const { tracker, get, set } = setup();
      yield* set('a', 'x', 1);
      yield* tracker.undo();
      yield* set('a', 'x', 2);

      expect(tracker.canUndo()).toBe(true);
      expect(tracker.canRedo()).toBe(false);
      yield* tracker.undo();
      expect(get('a', 'x')).toBe(0);
    }),
  );

  it.effect('does not fold past a transaction that touched the scope under another scope', () =>
    Effect.gen(function* () {
      const { invoker, tracker, get, set } = setup();
      yield* set('a', 'x', 1);
      yield* tracker.transaction(
        'mixed',
        Effect.gen(function* () {
          yield* invoker.invoke(SetField, { doc: 'a', field: 'x', value: 5 });
          yield* invoker.invoke(SetField, { doc: 'b', field: 'x', value: 1 });
        }),
      );
      yield* set('a', 'x', 2);

      yield* tracker.undo();
      expect(get('a', 'x')).toBe(5);
      yield* tracker.undo();
      expect(get('a', 'x')).toBe(1);
      expect(get('b', 'x')).toBe(0);
      yield* tracker.undo();
      expect(get('a', 'x')).toBe(0);
      expect(tracker.canUndo()).toBe(false);
    }),
  );

  it.effect('a mapping with merge folds relative edits into one forward and derives its inverse from it', () =>
    Effect.gen(function* () {
      const AddField = Operation.make({
        input: Schema.Struct({ field: Schema.String, delta: Schema.Number }),
        output: Schema.Void,
        meta: { key: DXN.make('com.example.operation.test.addField') },
      });
      const store = new Map<string, number>();
      let processed = 0;
      const addHandler = Operation.withHandler(AddField, ({ field, delta }) =>
        Effect.sync(() => void store.set(field, (store.get(field) ?? 0) + delta)),
      );
      const invoker = OperationInvoker.make(() => Effect.succeed([addHandler]), testRuntime);
      const tracker = HistoryTracker.make(
        invoker,
        UndoRegistry.make(() => [
          UndoMapping.make({
            operation: AddField,
            inverse: AddField,
            deriveContext: (input) => {
              processed++;
              return { field: input.field, delta: -input.delta };
            },
            mergeKey: (input) => input.field,
            merge: (earlier, later) => ({
              input: { ...later.input, delta: earlier.input.delta + later.input.delta },
              output: later.output,
            }),
          }),
        ]),
      );
      const add = (delta: number) =>
        Effect.gen(function* () {
          const before = processed;
          yield* invoker.invoke(AddField, { field: 'x', delta });
          yield* waitUntil(() => processed > before);
        });

      yield* add(1);
      vi.setSystemTime(100);
      yield* add(2);

      yield* tracker.undo();
      expect(store.get('x')).toBe(0);
      expect(tracker.canUndo()).toBe(false);
      yield* tracker.redo();
      expect(store.get('x')).toBe(3);
    }),
  );

  it.effect('does not fold into a transaction', () =>
    Effect.gen(function* () {
      const { invoker, tracker, get, set } = setup();
      yield* tracker.transaction('group', invoker.invoke(SetField, { doc: 'a', field: 'x', value: 1 }));
      yield* set('a', 'x', 2);

      yield* tracker.undo();
      expect(get('a', 'x')).toBe(1);
      expect(tracker.canUndo()).toBe(true);
    }),
  );
});

describe('HistoryTracker context', () => {
  it.effect('returns and emits the entry context around undo and redo', () =>
    Effect.gen(function* () {
      const { tracker, set } = setup();
      yield* Effect.scoped(
        Effect.gen(function* () {
          const applied = yield* PubSub.subscribe(tracker.applied);
          yield* set('a', 'x', 1, 'selection-1');

          expect((yield* tracker.undo()).context).toBe('selection-1');
          expect((yield* tracker.redo()).context).toBe('selection-1');

          const events = yield* PubSub.takeAll(applied);
          expect(events.map(({ type, phase, context }) => [type, phase, context])).toEqual([
            ['undo', 'before', 'selection-1'],
            ['undo', 'after', 'selection-1'],
            ['redo', 'before', 'selection-1'],
            ['redo', 'after', 'selection-1'],
          ]);
        }),
      );
    }),
  );

  it.effect('publishes the before event ahead of the inverse', () =>
    Effect.gen(function* () {
      const { tracker, set, hooks } = setup();
      yield* set('a', 'x', 1, 'here');

      yield* Effect.scoped(
        Effect.gen(function* () {
          const applied = yield* PubSub.subscribe(tracker.applied);
          const queuedAtWrite: number[] = [];
          hooks.onWrite = () => queuedAtWrite.push(Effect.runSync(PubSub.remaining(applied)));
          yield* tracker.undo();
          expect(queuedAtWrite).toEqual([1]);
        }),
      );
    }),
  );

  it.effect('a merged entry keeps the earliest context', () =>
    Effect.gen(function* () {
      const { tracker, set } = setup();
      yield* set('a', 'x', 1, 'first');
      yield* set('a', 'x', 2, 'second');
      expect((yield* tracker.undo()).context).toBe('first');
    }),
  );
});

describe('HistoryTracker limit', () => {
  it.effect('keeps at most `limit` entries', () =>
    Effect.gen(function* () {
      const { tracker, get, set } = setup({ limit: 3 });
      for (const field of ['a', 'b', 'c', 'd', 'e']) {
        yield* set('doc', field, 1);
      }

      yield* tracker.undo();
      yield* tracker.undo();
      yield* tracker.undo();
      expect(tracker.canUndo()).toBe(false);
      expect(get('doc', 'a')).toBe(1);
      expect(get('doc', 'b')).toBe(1);
      expect(get('doc', 'c')).toBe(0);

      const result = yield* tracker.undo().pipe(Effect.result);
      expect(result._tag).toBe('Failure');
    }),
  );
});
