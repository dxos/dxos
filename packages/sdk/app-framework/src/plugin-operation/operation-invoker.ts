//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import type { OperationDefinition } from '@dxos/operation';
import { byPosition } from '@dxos/util';

import * as Common from '../common';
import { Capability } from '../core';

import { NoHandlerError } from './errors';
import type { InvocationEvent, OperationHandlerRegistration, OperationInvokerInterface } from './types';

/**
 * Creates an OperationInvoker that resolves handlers and invokes operations.
 * Emits invocation events to subscribers after successful invocations.
 */
export const createOperationInvoker = (
  getHandlers: () => OperationHandlerRegistration[],
): OperationInvokerInterface => {
  const subscribers = new Set<(event: InvocationEvent) => void>();

  const resolveHandler = (operation: OperationDefinition<any, any>, input: any) => {
    const candidates = getHandlers()
      .filter((reg) => reg.operation.meta.key === operation.meta.key)
      .filter((reg) => !reg.filter || reg.filter(input))
      .toSorted(byPosition);

    if (candidates.length === 0) {
      return undefined;
    }

    return candidates[0].handler;
  };

  const invokeCore = <I, O>(op: OperationDefinition<I, O>, input: I): Effect.Effect<O, Error> => {
    return Effect.gen(function* () {
      const handler = resolveHandler(op, input);
      if (!handler) {
        return yield* Effect.fail(new NoHandlerError(op.meta.key));
      }

      log('invoking operation', { key: op.meta.key, input });
      const output = yield* handler(input);
      log('operation completed', { key: op.meta.key, output });

      return output as O;
    });
  };

  const emit = (event: InvocationEvent) => {
    for (const subscriber of subscribers) {
      try {
        subscriber(event);
      } catch (err) {
        log.error('subscriber error', { error: err });
      }
    }
  };

  const invoke = <I, O>(op: OperationDefinition<I, O>, input: I): Effect.Effect<O, Error> => {
    return Effect.gen(function* () {
      const output = yield* invokeCore(op, input);

      // Emit event after successful invocation.
      emit({
        operation: op,
        input,
        output,
        timestamp: Date.now(),
      });

      return output;
    });
  };

  const invokePromise = async <I, O>(op: OperationDefinition<I, O>, input: I): Promise<{ data?: O; error?: Error }> => {
    return runAndForwardErrors(invoke(op, input))
      .then((data) => ({ data }))
      .catch((error) => {
        log.catch(error);
        return { error };
      });
  };

  // Internal invoke that skips event emission (for undo operations).
  const invokeInternal = <I, O>(op: OperationDefinition<I, O>, input: I): Effect.Effect<O, Error> => {
    return invokeCore(op, input);
  };

  const subscribe = (handler: (event: InvocationEvent) => void): (() => void) => {
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  };

  return {
    invoke,
    invokePromise,
    invokeInternal,
    subscribe,
  };
};

export default Capability.makeModule((context) =>
  Effect.gen(function* () {
    const invoker = createOperationInvoker(() => context.getCapabilities(Common.Capability.OperationHandler).flat());

    return Effect.succeed(Capability.contributes(Common.Capability.OperationInvoker, invoker));
  }).pipe(Effect.flatten),
);
