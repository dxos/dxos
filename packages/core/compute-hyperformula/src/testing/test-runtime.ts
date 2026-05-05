//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { type SpaceId } from '@dxos/client/echo';
import { Operation, OperationHandlerSet } from '@dxos/operation';

import { type FunctionsRuntimeProvider } from '../compute-graph-registry';

/**
 * Minimal compute runtime provider for tests and Storybook.
 * Will cause errors if used for actual runtime.
 */
export const createMockedComputeRuntimeProvider = ({
  functions,
}: { functions?: OperationHandlerSet.OperationHandlerSet } = {}): FunctionsRuntimeProvider => {
  return {
    getRuntime: (_spaceId: SpaceId) =>
      ManagedRuntime.make(
        functions
          ? Layer.effect(
              Operation.Service,
              Effect.gen(function* () {
                const handlers = yield* functions.handlers;
                return {
                  invoke: (op: any, ...args: any[]) => {
                    const handler = handlers.find((h: any) => h.meta.key === op.meta.key);
                    if (!handler) {
                      return Effect.die(`No handler found for operation: ${op.meta.key}`);
                    }
                    const result = handler.handler(args[0]);
                    if (Effect.isEffect(result)) {
                      return result as Effect.Effect<unknown>;
                    }
                    return Effect.promise(() => Promise.resolve(result));
                  },
                  schedule: () => Effect.void,
                  invokePromise: async () => ({ error: new Error('Not implemented in test runtime') }),
                } as Operation.OperationService;
              }),
            )
          : Layer.succeed(Operation.Service, {
              invoke: () => Effect.die('Operation.Service not available in test.'),
              schedule: () => Effect.die('Operation.Service not available in test.'),
              invokePromise: async () => ({ error: new Error('Not available') }),
            } as any),
      ),
  };
};
