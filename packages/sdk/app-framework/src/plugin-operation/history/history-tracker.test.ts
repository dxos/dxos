//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { describe, expect } from 'vitest';

import { Obj } from '@dxos/echo';
import { Trace } from '@dxos/functions';
import { type Operation } from '@dxos/operation';

import { type Label } from '../../common';
import { Compute, HalveCompute, ToString } from '../testing';
import * as HistoryTracker from './history-tracker';
import * as UndoMapping from './undo-mapping';
import * as UndoRegistry from './undo-registry';

//
// Test helpers
//

let pidCounter = 0;
const nextPid = (): string => `pid-${++pidCounter}`;

const makeMessage = (pid: string, events: Trace.Event[], isEphemeral: boolean): Trace.Message =>
  Obj.make(Trace.Message, {
    meta: { pid },
    isEphemeral,
    events,
  });

const event = <T>(eventType: Trace.EventType<T>, data: T): Trace.Event => ({
  type: eventType.key,
  timestamp: Date.now(),
  data,
});

/**
 * Simulates the `operation.input`, `operation.output`, and `operation.end`
 * trace messages that the process manager would publish for a successful
 * operation invocation. Events are split across multiple messages to
 * mirror the production layout: ephemeral input/output are emitted as
 * separate ephemeral messages, end as a persisted one.
 */
const publishSuccess = (
  sink: Trace.Sink,
  pid: string,
  op: Operation.Definition<any, any>,
  input: unknown,
  output: unknown,
): void => {
  sink.write(
    makeMessage(pid, [event(Trace.OperationInput, { key: op.meta.key, name: op.meta.name, input })], true),
  );
  sink.write(
    makeMessage(pid, [event(Trace.OperationOutput, { key: op.meta.key, name: op.meta.name, output })], true),
  );
  sink.write(
    makeMessage(
      pid,
      [event(Trace.OperationEnd, { key: op.meta.key, name: op.meta.name, outcome: 'success' })],
      false,
    ),
  );
};

const publishFailure = (sink: Trace.Sink, pid: string, op: Operation.Definition<any, any>, input: unknown): void => {
  sink.write(
    makeMessage(pid, [event(Trace.OperationInput, { key: op.meta.key, name: op.meta.name, input })], true),
  );
  sink.write(
    makeMessage(
      pid,
      [event(Trace.OperationEnd, { key: op.meta.key, name: op.meta.name, outcome: 'failure', error: 'boom' })],
      false,
    ),
  );
};

interface InverseCall {
  readonly inverse: Operation.Definition<any, any>;
  readonly inverseInput: unknown;
}

const makeTestInvoker = (): {
  invoker: HistoryTracker.HistoryTrackerInvoker;
  inverseCalls: InverseCall[];
  showUndoCalls: (Label | undefined)[];
} => {
  const inverseCalls: InverseCall[] = [];
  const showUndoCalls: (Label | undefined)[] = [];
  const invoker: HistoryTracker.HistoryTrackerInvoker = {
    invokeInverse: (inverse, inverseInput) =>
      Effect.sync(() => {
        inverseCalls.push({ inverse, inverseInput });
      }),
    invokeShowUndo: (message) => {
      showUndoCalls.push(message);
    },
  };
  return { invoker, inverseCalls, showUndoCalls };
};

//
// Tests
//

describe('HistoryTracker', () => {
  it.effect('tracks undoable operations', () =>
    Effect.gen(function* () {
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      });

      const { invoker } = makeTestInvoker();
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make({ invoker, undoRegistry });

      expect(tracker.canUndo()).toBe(false);

      publishSuccess(tracker.traceSink, nextPid(), Compute, { value: 2 }, { value: 4 });

      expect(tracker.canUndo()).toBe(true);
    }),
  );

  it.effect('does not track operations without undo mapping', () =>
    Effect.gen(function* () {
      const { invoker } = makeTestInvoker();
      const undoRegistry = UndoRegistry.make(() => []);
      const tracker = HistoryTracker.make({ invoker, undoRegistry });

      publishSuccess(tracker.traceSink, nextPid(), ToString, { value: 42 }, { string: '42' });

      expect(tracker.canUndo()).toBe(false);
    }),
  );

  it.effect('undo invokes inverse operation', () =>
    Effect.gen(function* () {
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      });

      const { invoker, inverseCalls } = makeTestInvoker();
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make({ invoker, undoRegistry });

      publishSuccess(tracker.traceSink, nextPid(), Compute, { value: 2 }, { value: 4 });
      expect(tracker.canUndo()).toBe(true);

      yield* tracker.undo();

      expect(inverseCalls.length).toBe(1);
      expect(inverseCalls[0]!.inverse.meta.key).toBe(HalveCompute.meta.key);
      expect(inverseCalls[0]!.inverseInput).toEqual({ value: 4 });
      expect(tracker.canUndo()).toBe(false);
    }),
  );

  it.effect('multiple undos work in LIFO order', () =>
    Effect.gen(function* () {
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      });

      const { invoker, inverseCalls } = makeTestInvoker();
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make({ invoker, undoRegistry });

      publishSuccess(tracker.traceSink, nextPid(), Compute, { value: 2 }, { value: 4 });
      publishSuccess(tracker.traceSink, nextPid(), Compute, { value: 3 }, { value: 6 });

      yield* tracker.undo();
      expect(inverseCalls[0]!.inverseInput).toEqual({ value: 6 });

      yield* tracker.undo();
      expect(inverseCalls[1]!.inverseInput).toEqual({ value: 4 });

      expect(tracker.canUndo()).toBe(false);
    }),
  );

  it.effect('undo on empty history returns error', () =>
    Effect.gen(function* () {
      const { invoker } = makeTestInvoker();
      const undoRegistry = UndoRegistry.make(() => []);
      const tracker = HistoryTracker.make({ invoker, undoRegistry });

      const result = yield* tracker.undo().pipe(Effect.either);
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left.message).toContain('empty');
      }
    }),
  );

  it.effect('fires ShowUndo with static message when undoable operation is tracked', () =>
    Effect.gen(function* () {
      const testMessage: [string, { ns: string }] = ['test-undo.message', { ns: 'test' }];
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
        message: testMessage,
      });

      const { invoker, showUndoCalls } = makeTestInvoker();
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make({ invoker, undoRegistry });

      publishSuccess(tracker.traceSink, nextPid(), Compute, { value: 2 }, { value: 4 });

      expect(showUndoCalls.length).toBe(1);
      expect(showUndoCalls[0]).toEqual(testMessage);
    }),
  );

  it.effect('ShowUndo message can be derived from input and output', () =>
    Effect.gen(function* () {
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

      const { invoker, showUndoCalls } = makeTestInvoker();
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make({ invoker, undoRegistry });

      publishSuccess(tracker.traceSink, nextPid(), Compute, { value: 2 }, { value: 4 });

      expect(showUndoCalls.length).toBe(1);
      expect(showUndoCalls[0]).toEqual(['computed-2-to-4', { ns: 'test' }]);
    }),
  );

  it.effect('does not track when deriveContext returns undefined', () =>
    Effect.gen(function* () {
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => (output.value < 10 ? undefined : { value: output.value }),
      });

      const { invoker } = makeTestInvoker();
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make({ invoker, undoRegistry });

      publishSuccess(tracker.traceSink, nextPid(), Compute, { value: 2 }, { value: 4 });

      expect(tracker.canUndo()).toBe(false);
    }),
  );

  it.effect('tracks when deriveContext returns a value', () =>
    Effect.gen(function* () {
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => (output.value < 10 ? undefined : { value: output.value }),
      });

      const { invoker } = makeTestInvoker();
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make({ invoker, undoRegistry });

      publishSuccess(tracker.traceSink, nextPid(), Compute, { value: 5 }, { value: 10 });

      expect(tracker.canUndo()).toBe(true);
    }),
  );

  it.effect('does not track failed operations', () =>
    Effect.gen(function* () {
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      });

      const { invoker } = makeTestInvoker();
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make({ invoker, undoRegistry });

      publishFailure(tracker.traceSink, nextPid(), Compute, { value: 2 });

      expect(tracker.canUndo()).toBe(false);
    }),
  );

  it.effect('handles batched input+output+end in a single message', () =>
    Effect.gen(function* () {
      const undoMapping = UndoMapping.make({
        operation: Compute,
        inverse: HalveCompute,
        deriveContext: (_input, output) => ({ value: output.value }),
      });

      const { invoker } = makeTestInvoker();
      const undoRegistry = UndoRegistry.make(() => [undoMapping]);
      const tracker = HistoryTracker.make({ invoker, undoRegistry });

      const pid = nextPid();
      tracker.traceSink.write(
        makeMessage(
          pid,
          [
            event(Trace.OperationInput, { key: Compute.meta.key, input: { value: 2 } }),
            event(Trace.OperationOutput, { key: Compute.meta.key, output: { value: 4 } }),
            event(Trace.OperationEnd, { key: Compute.meta.key, outcome: 'success' }),
          ],
          false,
        ),
      );

      expect(tracker.canUndo()).toBe(true);
    }),
  );
});
