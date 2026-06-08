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

type CapabilityManagerLike = {
  get: (cap: Capability.InterfaceDef<Capabilities.OperationInvoker>) => Capabilities.OperationInvoker;
};

/**
 * Creates a capture that wraps the real `Capabilities.OperationInvoker`:
 *
 * - **Mocked operations** (declared in `mockedOperations`) are intercepted: the call is recorded
 *   and returns `{ data: undefined }` without executing. Use this for side-effecting operations
 *   you don't want to run in tests, such as `LayoutOperation.Open` (navigation).
 *
 * - **All other operations** are forwarded to the real invoker and still execute normally. The
 *   call is still recorded so you can assert it was triggered even though it ran for real.
 *
 * Pass a `spyFn` wrapper (e.g. `fn` from `storybook/test`) to get Storybook Actions panel
 * integration and vi-style matchers on the recording.
 *
 * @example
 * ```ts
 * import { fn } from 'storybook/test';
 *
 * const capture = makeOperationCapture(
 *   // These ops are mocked: captured but not executed.
 *   [AssistantOperation.RunPromptInNewChat, LayoutOperation.Open],
 *   fn,
 * );
 *
 * // Wire into withPluginManager:
 * capabilities: (manager) => capture.wrap(manager)
 *
 * // Assert in a play function:
 * const calls = capture.getCalls(AssistantOperation.RunPromptInNewChat);
 * expect(calls).toHaveLength(1);
 * expect(calls[0].input.prompt).toBe('Draft a new document');
 * ```
 */
export type OperationCapture = {
  /**
   * Wraps the real OperationInvoker from the given manager. Pass to
   * `withPluginManager({ capabilities: (m) => capture.wrap(m) })`.
   */
  wrap(manager: CapabilityManagerLike): Capability.Any[];
  /** Returns all recorded calls (mocked or real) for the given operation. */
  getCalls<I, O>(op: Operation.Definition<I, O>): CapturedCall<I>[];
  /** Clears all recorded calls (useful between play function steps). */
  reset(): void;
};

export const makeOperationCapture = (
  mockedOperations: readonly Operation.Definition.Any[],
  spyFn?: (impl: (...args: any[]) => any) => any,
): OperationCapture => {
  const calls: CapturedCall[] = [];

  const mockedKeys = new Set(mockedOperations.map((op) => String(op.meta.key)));

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
          if (mockedKeys.has(String(op.meta.key))) {
            return Effect.succeed(undefined as any);
          }
          return (real.invoke as any)(op, input, ...rest);
        },
        invokePromise: async (op: Operation.Definition<any, any>, input?: unknown, ...rest: any[]) => {
          recordFn(op, input);
          if (mockedKeys.has(String(op.meta.key))) {
            return { data: undefined };
          }
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
