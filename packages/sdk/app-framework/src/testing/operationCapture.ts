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
  getAll: (cap: Capability.InterfaceDef<Capabilities.OperationInvoker>) => Capabilities.OperationInvoker[];
};

export type OperationCapture = {
  /**
   * Wraps the real OperationInvoker from the given manager. Pass to
   * `withPluginManager({ capabilities: (m) => capture.wrap(m) })`.
   */
  wrap(manager: CapabilityManagerLike): Capability.AnyContribution[];
  /** Returns all recorded calls (mocked or real) for the given operation. */
  getCalls<I, O>(op: Operation.Definition<I, O>): CapturedCall<I>[];
  /** Clears all recorded calls (useful between play function steps). */
  reset(): void;
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
 *
 * @idiom org.dxos.app-framework.testing.operationCapture
 *   applies: Storybook play-function tests for components that call plugin operations
 *   instead-of: Loading every plugin whose operations the component triggers
 *   uses: {@link makeOperationCapture}, {@link withPluginManager}
 */
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
      // Use getAll to find the real invoker that was registered before our wrapper. manager.get
      // returns the last contribution (ours, once added), but getAll returns them all in order.
      // On first invocation (when activation is complete) we find the non-wrapper contribution.
      let real: Capabilities.OperationInvoker | undefined;
      const delegate = () => {
        if (!real) {
          const all = manager.getAll(Capabilities.OperationInvoker);
          real = all.find((inv) => inv !== wrapped);
        }
        return real;
      };

      const wrapped: Capabilities.OperationInvoker = {
        get invocations() {
          return delegate()!.invocations;
        },
        get pendingFollowups() {
          return delegate()!.pendingFollowups;
        },
        get awaitFollowups() {
          return delegate()!.awaitFollowups;
        },
        invoke: (op: Operation.Definition<any, any>, input?: unknown, ...rest: any[]) => {
          recordFn(op, input);
          if (mockedKeys.has(String(op.meta.key))) {
            return Effect.succeed(undefined as any);
          }
          return (delegate()!.invoke as any)(op, input, ...rest);
        },
        invokePromise: async (op: Operation.Definition<any, any>, input?: unknown, ...rest: any[]) => {
          recordFn(op, input);
          if (mockedKeys.has(String(op.meta.key))) {
            return { data: undefined };
          }
          return (delegate()!.invokePromise as any)(op, input, ...rest);
        },
        schedule: (op: Operation.Definition<any, any>, input?: unknown, ...rest: any[]) => {
          recordFn(op, input);
          if (mockedKeys.has(String(op.meta.key))) {
            return Effect.succeed(undefined);
          }
          return (delegate()!.schedule as any)(op, input, ...rest);
        },
      };

      return [Capability.provide(Capabilities.OperationInvoker, wrapped)];
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
