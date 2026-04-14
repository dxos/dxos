//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { type SpaceId } from '@dxos/client/echo';
import { NoHandlerError, Operation, OperationHandlerSet } from '@dxos/operation';

import { type FunctionsRuntimeProvider } from '../compute-graph-registry';

/**
 * Minimal compute runtime provider for tests and Storybook.
 * Will cause errors if used for actual runtime.
 */
export const createMockedComputeRuntimeProvider = ({
  functions = OperationHandlerSet.make(),
}: { functions?: OperationHandlerSet.OperationHandlerSet } = {}): FunctionsRuntimeProvider => {
  return {
    getRuntime: (_spaceId: SpaceId) =>
      ManagedRuntime.make(
        Layer.effect(
          Operation.Service,
          Effect.gen(function* () {
            const handlers = yield* functions.handlers;
            return {
              invoke: (op: Operation.Definition.Any, ...args: [any?, any?]) => {
                const input = args[0];
                const handler = handlers.find((handler) => handler.meta.key === op.meta.key);
                if (!handler) {
                  return Effect.fail(new NoHandlerError(op.meta.key));
                }
                return handler.handler(input) as Effect.Effect<any, NoHandlerError>;
              },
              schedule: () => Effect.void,
              invokePromise: async () => ({ error: new Error('Not implemented in test runtime') }),
            } satisfies Operation.OperationService;
          }),
        ).pipe(Layer.orDie),
      ),
  };
};
