//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as PubSub from 'effect/PubSub';

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
 * Creates a capture object that records `invokePromise` calls for assertion in Storybook play
 * functions. Contributes a stub `Capabilities.OperationInvoker` and exposes `getCalls(op)` for
 * typed per-operation assertions.
 *
 * Pass a `spyFn` wrapper (e.g. `fn` from `storybook/test`) to get Storybook Actions panel
 * integration and vi-style matchers on the underlying spy. If omitted a plain function is used.
 *
 * @example
 * ```ts
 * import { fn } from 'storybook/test';
 * const capture = makeOperationCapture(fn);
 *
 * // Pass to withPluginManager:
 * capabilities: [capture.capability]
 *
 * // Assert in a play function:
 * const calls = capture.getCalls(AssistantOperation.RunPromptInNewChat);
 * expect(calls).toHaveLength(1);
 * expect(calls[0].input.prompt).toBe('Draft a new document');
 * ```
 */
export type OperationCapture = {
  /** Contribute this via `withPluginManager({ capabilities: [capture.capability] })`. */
  readonly capability: Capability.Any;
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

  const recordingImpl = async (op: Operation.Definition<any, any>, input?: unknown) => {
    calls.push({ operationKey: String(op.meta.key), input: input ?? {} });
    return { data: undefined };
  };

  const invokePromise = spyFn ? spyFn(recordingImpl) : recordingImpl;

  const stub: Capabilities.OperationInvoker = {
    invoke: () => Effect.succeed(undefined as any),
    schedule: () => Effect.succeed(undefined),
    invokePromise: invokePromise as any,
    invocations: Effect.runSync(PubSub.unbounded()),
    pendingFollowups: Effect.succeed(0),
    awaitFollowups: Effect.void,
  };

  const capability = Capability.contributes(Capabilities.OperationInvoker, stub);

  return {
    capability,
    getCalls<I, O>(op: Operation.Definition<I, O>): CapturedCall<I>[] {
      const key = String(op.meta.key);
      return calls.filter((c) => c.operationKey === key) as CapturedCall<I>[];
    },
    reset() {
      calls.length = 0;
    },
  };
};
