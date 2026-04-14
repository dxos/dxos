//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { AiService } from '@dxos/ai';
import { type SpaceId } from '@dxos/client/echo';
import { Database, Feed } from '@dxos/echo';
import { CredentialsService, FunctionInvocationService, QueueService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTest } from '@dxos/functions-runtime/testing';
import { Operation, OperationHandlerSet } from '@dxos/operation';

import { type FunctionsRuntimeProvider } from '../compute-graph-registry';

const operationServiceFromFunctionInvocationService = Layer.effect(
  Operation.Service,
  Effect.gen(function* () {
    const functionInvocationService = yield* FunctionInvocationService;
    return {
      invoke: (op: any, ...args: any[]) => functionInvocationService.invokeFunction(op, args[0]),
      schedule: (op: any, ...args: any[]) =>
        functionInvocationService.invokeFunction(op, args[0]).pipe(Effect.fork, Effect.asVoid),
      invokePromise: async () => {
        return { error: new Error('invokePromise not available in test.') };
      },
    } as any;
  }),
);

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
          ? operationServiceFromFunctionInvocationService.pipe(
              Layer.provideMerge(
                FunctionInvocationServiceLayerTest({ functions }).pipe(
                  Layer.provide(AiService.notAvailable),
                  Layer.provide(CredentialsService.configuredLayer([])),
                  Layer.provide(Database.notAvailable),
                  Layer.provide(QueueService.notAvailable),
                  Layer.provide(Feed.notAvailable),
                ),
              ),
            )
          : Layer.succeed(Operation.Service, {
              invoke: () => Effect.die('Operation.Service not available in test.'),
              schedule: () => Effect.die('Operation.Service not available in test.'),
              invokePromise: async () => ({ error: new Error('Not available') }),
            } as any),
      ),
  };
};
