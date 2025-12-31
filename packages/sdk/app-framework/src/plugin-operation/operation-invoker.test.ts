//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { runAndForwardErrors } from '@dxos/effect';
import * as Operation from '@dxos/operation';

import { NoHandlerError } from './errors';
import { createHistoryTracker } from './history-tracker';
import { createOperationInvoker } from './operation-invoker';
import type { OperationHandlerRegistration, UndoMappingRegistration } from './types';
import { createUndoRegistry } from './undo-registry';

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

const HalveCompute = Operation.make({
  schema: {
    input: Schema.Struct({ value: Schema.Number }),
    output: Schema.Struct({ value: Schema.Number }),
  },
  meta: { key: 'test.halve-compute' },
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

const computeHandler: OperationHandlerRegistration = {
  operation: Compute,
  handler: (data: { value: number }) =>
    Effect.gen(function* () {
      yield* Effect.sleep(data.value * 10);
      return { value: data.value * 2 };
    }),
};

const halveComputeHandler: OperationHandlerRegistration = {
  operation: HalveCompute,
  handler: (data: { value: number }) => Effect.succeed({ value: data.value / 2 }),
};

const toStringHandler: OperationHandlerRegistration = {
  operation: ToString,
  handler: (data: { value: number }) => Effect.succeed({ string: data.value.toString() }),
};

const addHandler: OperationHandlerRegistration = {
  operation: Add,
  handler: (data: [number, number]) => Effect.succeed(data[0] + data[1]),
};

const sideEffectHandler: OperationHandlerRegistration = {
  operation: SideEffect,
  handler: () => Effect.succeed(undefined),
};

describe('OperationInvoker', () => {
  test('throws error if no handler found', async ({ expect }) => {
    const invoker = createOperationInvoker(() => []);
    const { data, error } = await invoker.invokePromise(Compute, { value: 1 });

    expect(data).toBe(undefined);
    expect(error).toBeInstanceOf(NoHandlerError);
  });

  test('matches operation to handler and executes', async ({ expect }) => {
    const invoker = createOperationInvoker(() => [toStringHandler]);
    const { data, error } = await invoker.invokePromise(ToString, { value: 42 });

    expect(error).toBe(undefined);
    expect(data?.string).toBe('42');
  });

  test('update handlers dynamically', async ({ expect }) => {
    const handlers: OperationHandlerRegistration[] = [];
    const invoker = createOperationInvoker(() => handlers);

    // No handler registered.
    const { error } = await invoker.invokePromise(ToString, { value: 1 });
    expect(error).toBeInstanceOf(NoHandlerError);

    // Add handler.
    handlers.push(toStringHandler);
    const { data } = await invoker.invokePromise(ToString, { value: 1 });
    expect(data?.string).toBe('1');

    // Remove handler.
    handlers.splice(handlers.indexOf(toStringHandler), 1);
    const { data: data2, error: error2 } = await invoker.invokePromise(ToString, { value: 1 });
    expect(data2).toBe(undefined);
    expect(error2).toBeInstanceOf(NoHandlerError);
  });

  test('compose operation effects', async ({ expect }) => {
    const invoker = createOperationInvoker(() => [computeHandler]);
    const program = Effect.gen(function* () {
      const a = yield* invoker.invoke(Compute, { value: 1 });
      const b = yield* invoker.invoke(Compute, { value: 2 });
      return b.value - a.value;
    });

    expect(await runAndForwardErrors(program)).toBe(2);
  });

  test('concurrent operation effects', async ({ expect }) => {
    const invoker = createOperationInvoker(() => [computeHandler]);
    const program = Effect.gen(function* () {
      const fiberA = yield* Effect.fork(invoker.invoke(Compute, { value: 5 }));
      const fiberB = yield* Effect.fork(invoker.invoke(Compute, { value: 2 }));
      const [a, b] = yield* Fiber.join(Fiber.zip(fiberA, fiberB));
      return b.value - a.value;
    });

    expect(await runAndForwardErrors(program)).toBe(-6);
  });

  test('mix & match effect and promise APIs', async ({ expect }) => {
    const invoker = createOperationInvoker(() => [toStringHandler, computeHandler]);

    const program = Effect.gen(function* () {
      const a = yield* invoker.invoke(Compute, { value: 2 });
      const b = yield* invoker.invoke(ToString, { value: a.value });
      return b.string;
    });

    expect(await runAndForwardErrors(program)).toBe('4');

    const a = await invoker.invokePromise(Compute, { value: 2 });
    const b = await invoker.invokePromise(ToString, { value: a.data!.value });
    expect(b.data?.string).toBe('4');
  });

  test('filter handlers by predicate', async ({ expect }) => {
    const conditionalHandler: OperationHandlerRegistration = {
      operation: Compute,
      filter: (data: { value: number }) => data?.value > 1,
      handler: (data: { value: number }) => Effect.succeed({ value: data.value * 3 }),
    };
    const invoker = createOperationInvoker(() => [conditionalHandler, computeHandler]);

    const program = Effect.gen(function* () {
      // value=1 should use computeHandler (multiplies by 2).
      const a = yield* invoker.invoke(Compute, { value: 1 });
      expect(a.value).toBe(2);

      // value=2 should use conditionalHandler (multiplies by 3).
      const b = yield* invoker.invoke(Compute, { value: 2 });
      expect(b.value).toBe(6);
    });

    await runAndForwardErrors(program);
  });

  test('hoist handlers', async ({ expect }) => {
    const hoistedHandler: OperationHandlerRegistration = {
      operation: Compute,
      position: 'hoist',
      handler: (data: { value: number }) => Effect.succeed({ value: data.value * 3 }),
    };
    const invoker = createOperationInvoker(() => [computeHandler, hoistedHandler]);
    const { data } = await invoker.invokePromise(Compute, { value: 1 });
    expect(data?.value).toBe(3);
  });

  test('fallback handlers', async ({ expect }) => {
    const conditionalHandler: OperationHandlerRegistration = {
      operation: Compute,
      filter: (data: { value: number }) => data?.value === 1,
      handler: (data: { value: number }) => Effect.succeed({ value: data.value * 2 }),
    };
    const fallbackHandler: OperationHandlerRegistration = {
      operation: Compute,
      position: 'fallback',
      handler: (data: { value: number }) => Effect.succeed({ value: data.value * 3 }),
    };
    const invoker = createOperationInvoker(() => [conditionalHandler, fallbackHandler]);

    const program = Effect.gen(function* () {
      const a = yield* invoker.invoke(Compute, { value: 1 });
      expect(a.value).toBe(2);

      const b = yield* invoker.invoke(Compute, { value: 2 });
      expect(b.value).toBe(6);
    });

    await runAndForwardErrors(program);
  });

  test('non-struct inputs & outputs', async ({ expect }) => {
    const invoker = createOperationInvoker(() => [addHandler]);
    const { data } = await invoker.invokePromise(Add, [1, 1]);
    expect(data).toBe(2);
  });

  test('empty inputs & outputs', async ({ expect }) => {
    const invoker = createOperationInvoker(() => [sideEffectHandler]);
    const { data } = await invoker.invokePromise(SideEffect, undefined);
    expect(data).toBe(undefined);
  });

  test('emits invocation events to subscribers', async ({ expect }) => {
    const invoker = createOperationInvoker(() => [toStringHandler]);
    const events: any[] = [];

    const unsubscribe = invoker.subscribe((event) => {
      events.push(event);
    });

    await invoker.invokePromise(ToString, { value: 42 });
    await invoker.invokePromise(ToString, { value: 100 });

    expect(events.length).toBe(2);
    expect(events[0].operation.meta.key).toBe('test.to-string');
    expect(events[0].input.value).toBe(42);
    expect(events[0].output.string).toBe('42');
    expect(events[1].input.value).toBe(100);

    unsubscribe();

    // After unsubscribe, no more events.
    await invoker.invokePromise(ToString, { value: 200 });
    expect(events.length).toBe(2);
  });

  test('invokeInternal does not emit events', async ({ expect }) => {
    const invoker = createOperationInvoker(() => [toStringHandler]);
    const events: any[] = [];

    invoker.subscribe((event) => {
      events.push(event);
    });

    // Regular invoke emits.
    await runAndForwardErrors(invoker.invoke(ToString, { value: 1 }));
    expect(events.length).toBe(1);

    // Internal invoke does not emit.
    await runAndForwardErrors(invoker.invokeInternal(ToString, { value: 2 }));
    expect(events.length).toBe(1);
  });
});

describe('UndoRegistry', () => {
  test('looks up undo mapping by operation key', ({ expect }) => {
    const undoMapping: UndoMappingRegistration = {
      operation: Compute,
      inverse: HalveCompute,
      deriveContext: (input, output) => ({ value: output.value }),
    };
    const registry = createUndoRegistry(() => [undoMapping]);

    const result = registry.lookup(Compute);
    expect(result).not.toBe(undefined);
    expect(result?.inverse.meta.key).toBe('test.halve-compute');
  });

  test('returns undefined for unmapped operations', ({ expect }) => {
    const registry = createUndoRegistry(() => []);

    const result = registry.lookup(Compute);
    expect(result).toBe(undefined);
  });

  test('deriveContext extracts correct undo input', ({ expect }) => {
    const undoMapping: UndoMappingRegistration = {
      operation: Compute,
      inverse: HalveCompute,
      deriveContext: (input, output) => ({ value: output.value, originalInput: input.value }),
    };
    const registry = createUndoRegistry(() => [undoMapping]);

    const result = registry.lookup(Compute);
    const context = result?.deriveContext({ value: 5 }, { value: 10 });
    expect(context).toEqual({ value: 10, originalInput: 5 });
  });
});

describe('HistoryTracker', () => {
  test('tracks undoable operations', async ({ expect }) => {
    const undoMapping: UndoMappingRegistration = {
      operation: Compute,
      inverse: HalveCompute,
      deriveContext: (_input, output) => ({ value: output.value }),
    };

    const invoker = createOperationInvoker(() => [computeHandler, halveComputeHandler]);
    const undoRegistry = createUndoRegistry(() => [undoMapping]);
    const tracker = createHistoryTracker(invoker, undoRegistry);

    expect(tracker.canUndo()).toBe(false);

    await invoker.invokePromise(Compute, { value: 2 });

    expect(tracker.canUndo()).toBe(true);
  });

  test('does not track operations without undo mapping', async ({ expect }) => {
    const invoker = createOperationInvoker(() => [toStringHandler]);
    const undoRegistry = createUndoRegistry(() => []);
    const tracker = createHistoryTracker(invoker, undoRegistry);

    await invoker.invokePromise(ToString, { value: 42 });

    expect(tracker.canUndo()).toBe(false);
  });

  test('undo invokes inverse operation', async ({ expect }) => {
    const undoMapping: UndoMappingRegistration = {
      operation: Compute,
      inverse: HalveCompute,
      deriveContext: (_input, output) => ({ value: output.value }),
    };

    let halveWasCalled = false;
    const trackingHalveHandler: OperationHandlerRegistration = {
      operation: HalveCompute,
      handler: (data: { value: number }) => {
        halveWasCalled = true;
        return Effect.succeed({ value: data.value / 2 });
      },
    };

    const invoker = createOperationInvoker(() => [computeHandler, trackingHalveHandler]);
    const undoRegistry = createUndoRegistry(() => [undoMapping]);
    const tracker = createHistoryTracker(invoker, undoRegistry);

    // Invoke compute: 2 * 2 = 4.
    await invoker.invokePromise(Compute, { value: 2 });
    expect(tracker.canUndo()).toBe(true);

    // Undo should invoke halve with { value: 4 }.
    const { error } = await tracker.undoPromise();
    expect(error).toBe(undefined);
    expect(halveWasCalled).toBe(true);
    expect(tracker.canUndo()).toBe(false);
  });

  test('undo uses invokeInternal to skip stream', async ({ expect }) => {
    const undoMapping: UndoMappingRegistration = {
      operation: Compute,
      inverse: HalveCompute,
      deriveContext: (_input, output) => ({ value: output.value }),
    };

    const invoker = createOperationInvoker(() => [computeHandler, halveComputeHandler]);
    const undoRegistry = createUndoRegistry(() => [undoMapping]);
    const tracker = createHistoryTracker(invoker, undoRegistry);

    const events: any[] = [];
    invoker.subscribe((event) => events.push(event));

    // Invoke compute (should emit event).
    await invoker.invokePromise(Compute, { value: 2 });
    expect(events.length).toBe(1);

    // Undo (should NOT emit event).
    await tracker.undoPromise();
    expect(events.length).toBe(1);
  });

  test('multiple undos work in LIFO order', async ({ expect }) => {
    const undoMapping: UndoMappingRegistration = {
      operation: Compute,
      inverse: HalveCompute,
      deriveContext: (_input, output) => ({ value: output.value }),
    };

    const halveInputs: number[] = [];
    const trackingHalveHandler: OperationHandlerRegistration = {
      operation: HalveCompute,
      handler: (data: { value: number }) => {
        halveInputs.push(data.value);
        return Effect.succeed({ value: data.value / 2 });
      },
    };

    const invoker = createOperationInvoker(() => [computeHandler, trackingHalveHandler]);
    const undoRegistry = createUndoRegistry(() => [undoMapping]);
    const tracker = createHistoryTracker(invoker, undoRegistry);

    // Invoke compute with 2 → 4, then 3 → 6.
    await invoker.invokePromise(Compute, { value: 2 });
    await invoker.invokePromise(Compute, { value: 3 });

    // First undo should halve 6.
    await tracker.undoPromise();
    expect(halveInputs[0]).toBe(6);

    // Second undo should halve 4.
    await tracker.undoPromise();
    expect(halveInputs[1]).toBe(4);

    expect(tracker.canUndo()).toBe(false);
  });

  test('undo on empty history returns error', async ({ expect }) => {
    const invoker = createOperationInvoker(() => []);
    const undoRegistry = createUndoRegistry(() => []);
    const tracker = createHistoryTracker(invoker, undoRegistry);

    const { error } = await tracker.undoPromise();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toContain('empty');
  });
});
