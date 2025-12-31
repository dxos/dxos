//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as TestClock from 'effect/TestClock';
import { describe, expect } from 'vitest';

import { OperationInvoker, OperationResolver } from '../invoker';
import {
  Compute,
  HalveCompute,
  ToString,
  computeHandler,
  createEventCollector,
  halveComputeHandler,
  toStringHandler,
  waitUntil,
} from '../testing';

import * as HistoryTracker from './history-tracker';
import type { UndoMappingRegistration } from './types';
import * as UndoRegistry from './undo-registry';

describe('HistoryTracker', () => {
  it.effect('tracks undoable operations', () =>
    Effect.gen(function* () {
      const undoMapping: UndoMappingRegistration = {
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      };

      const invoker = OperationInvoker.make(() => [computeHandler, halveComputeHandler]);
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make(invoker, undoRegistry);

      expect(tracker.canUndo()).toBe(false);

      // Fork compute operation and advance clock.
      const fiber = yield* Effect.fork(invoker.invoke(Compute, { value: 2 }));
      yield* TestClock.adjust('20 millis');
      yield* Fiber.join(fiber);

      // Wait until the tracker has processed the event.
      yield* waitUntil(() => tracker.canUndo());

      expect(tracker.canUndo()).toBe(true);
    }),
  );

  it.effect('does not track operations without undo mapping', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => [toStringHandler]);
      const undoRegistry = UndoRegistry.make(() => []);
      const tracker = HistoryTracker.make(invoker, undoRegistry);
      const collector = yield* createEventCollector(invoker);

      yield* invoker.invoke(ToString, { value: 42 });

      // Wait for event to be processed.
      yield* collector.waitForEvents(1);

      // Without an undo mapping, canUndo should remain false.
      expect(tracker.canUndo()).toBe(false);

      yield* collector.dispose;
    }),
  );

  it.effect('undo invokes inverse operation', () =>
    Effect.gen(function* () {
      const undoMapping: UndoMappingRegistration = {
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      };

      let halveWasCalled = false;
      const trackingHalveHandler = OperationResolver.make({
        operation: HalveCompute,
        handler: (data) => {
          halveWasCalled = true;
          return Effect.succeed({ value: data.value / 2 });
        },
      });

      const invoker = OperationInvoker.make(() => [computeHandler, trackingHalveHandler]);
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make(invoker, undoRegistry);

      // Fork compute operation: 2 * 2 = 4.
      const fiber = yield* Effect.fork(invoker.invoke(Compute, { value: 2 }));
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
      const undoMapping: UndoMappingRegistration = {
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      };

      const invoker = OperationInvoker.make(() => [computeHandler, halveComputeHandler]);
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make(invoker, undoRegistry);
      const collector = yield* createEventCollector(invoker);

      // Fork compute operation (should emit event).
      const fiber = yield* Effect.fork(invoker.invoke(Compute, { value: 2 }));
      yield* TestClock.adjust('20 millis');
      yield* Fiber.join(fiber);

      yield* collector.waitForEvents(1);
      expect(collector.events.length).toBe(1);

      // Wait until the tracker has processed the event.
      yield* waitUntil(() => tracker.canUndo());

      // Undo (should NOT emit event because it uses _invokeCore).
      yield* tracker.undo();

      // Verify no new events were emitted.
      expect(collector.events.length).toBe(1);

      yield* collector.dispose;
    }),
  );

  it.effect('multiple undos work in LIFO order', () =>
    Effect.gen(function* () {
      const undoMapping: UndoMappingRegistration = {
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      };

      const halveInputs: number[] = [];
      const trackingHalveHandler = OperationResolver.make({
        operation: HalveCompute,
        handler: (data) => {
          halveInputs.push(data.value);
          return Effect.succeed({ value: data.value / 2 });
        },
      });

      const invoker = OperationInvoker.make(() => [computeHandler, trackingHalveHandler]);
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make(invoker, undoRegistry);
      const collector = yield* createEventCollector(invoker);

      // Fork compute with 2 → 4.
      const fiber1 = yield* Effect.fork(invoker.invoke(Compute, { value: 2 }));
      yield* TestClock.adjust('20 millis');
      yield* Fiber.join(fiber1);

      // Fork compute with 3 → 6.
      const fiber2 = yield* Effect.fork(invoker.invoke(Compute, { value: 3 }));
      yield* TestClock.adjust('30 millis');
      yield* Fiber.join(fiber2);

      // Wait for both events to be collected.
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
      const invoker = OperationInvoker.make(() => []);
      const undoRegistry = UndoRegistry.make(() => []);
      const tracker = HistoryTracker.make(invoker, undoRegistry);

      const result = yield* tracker.undo().pipe(Effect.either);
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left.message).toContain('empty');
      }
    }),
  );
});
