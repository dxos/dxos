//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Operation } from '@dxos/compute';

import { Capabilities } from '../common';
import { Capability } from '../core';

export type CapturedCall<I = unknown> = {
  /** The DXN key string of the invoked operation. */
  operationKey: string;
  /** The input passed to the operation. */
  input: I;
};

/**
 * Creates a capture object that intercepts `invokePromise` calls for assertion in Storybook play
 * functions. Wraps the real `Capabilities.OperationInvoker` so all operations still execute
 * normally — the capture only records calls without blocking them. Exposes `getCalls(op)` for
 * typed per-operation assertions.
 *
 * Pass a `spyFn` wrapper (e.g. `fn` from `storybook/test`) to get Storybook Actions panel
 * integration and vi-style matchers on the recording. If omitted a plain function is used.
 *
 * @example
 * ```ts
 * import { fn } from 'storybook/test';
 * const capture = makeOperationCapture(fn);
 *
 * // Pass to withPluginManager — the capture reads the real invoker from the manager:
 * capabilities: [(manager) => [capture.attach(manager)]]
 *
 * // Assert in a play function:
 * const calls = capture.getCalls(AssistantOperation.RunPromptInNewChat);
 * expect(calls).toHaveLength(1);
 * expect(calls[0].input.prompt).toBe('Draft a new document');
 * ```
 */
export type OperationCapture = {
  /**
   * Returns a `Capability.Any` array that wraps the real OperationInvoker with recording.
   * Pass the result to `withPluginManager({ capabilities: [(m) => capture.wrap(m)] })`.
   */
  wrap(manager: {
    get: (cap: Capability.InterfaceDef<Capabilities.OperationInvoker>) => Capabilities.OperationInvoker;
  }): Capability.Any[];
  /** Returns all recorded calls whose operation key matches the given definition. */
  getCalls<I, O>(op: Operation.Definition<I, O>): CapturedCall<I>[];
  /** Clears all recorded calls (useful between play function steps). */
  reset(): void;
};

/**
 * @param spyFn - Optional wrapper that intercepts the recording function (e.g. `fn` from
 *   `storybook/test`). Enables Storybook Actions panel integration and vi-style matchers.
 */
export const makeOperationCapture = (spyFn?: (impl: (...args: any[]) => any) => any): OperationCapture => {
  const calls: CapturedCall[] = [];

  const record = (op: Operation.Definition<any, any>, input?: unknown) => {
    calls.push({ operationKey: String(op.meta.key), input: input ?? {} });
  };

  const recordFn = spyFn ? spyFn(record) : record;

  return {
    wrap(manager) {
      const real = manager.get(Capabilities.OperationInvoker);

      const wrapped: Capabilities.OperationInvoker = {
        ...real,
        invoke: (op: Operation.Definition<any, any>, input?: unknown, ...rest: any[]) => {
          recordFn(op, input);
          return (real.invoke as any)(op, input, ...rest);
        },
        invokePromise: async (op: Operation.Definition<any, any>, input?: unknown, ...rest: any[]) => {
          recordFn(op, input);
          return (real.invokePromise as any)(op, input, ...rest);
        },
      };

      return [Capability.contributes(Capabilities.OperationInvoker, wrapped)];
    },
    getCalls<I, O>(op: Operation.Definition<I, O>): CapturedCall<I>[] {
      const key = String(op.meta.key);
      return calls.filter((c) => c.operationKey === key) as CapturedCall<I>[];
    },
    reset() {
      calls.length = 0;
    },
  };
};
