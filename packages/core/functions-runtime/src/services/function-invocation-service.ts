//
// Copyright 2025 DXOS.org
//
import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { Database, Feed } from '@dxos/echo';
import { CredentialsService, FunctionInvocationService, type InvocationServices, QueueService } from '@dxos/functions';
import { type FunctionDefinition } from '@dxos/functions';

import { FunctionImplementationResolver, LocalFunctionExecutionService } from './local-function-execution';
import { RemoteFunctionExecutionService } from './remote-function-execution-service';

/**
 * Layer that provides FunctionInvocationService implementation routing between local and remote execution.
 */
export const FunctionInvocationServiceLayer = Layer.effect(
  FunctionInvocationService,
  Effect.gen(function* () {
    const localExecutionService = yield* LocalFunctionExecutionService;
    const remoteExecutionService = yield* RemoteFunctionExecutionService;

    return {
      invokeFunction: <I, O>(
        functionDef: FunctionDefinition<I, O>,
        input: I,
      ): Effect.Effect<O, never, InvocationServices> =>
        Effect.gen(function* () {
          if (functionDef.meta?.deployedFunctionId) {
            return yield* remoteExecutionService.callFunction<I, O>(functionDef.meta.deployedFunctionId, input);
          }

          return yield* localExecutionService.invokeFunction(functionDef, input);
        }),

      resolveFunction: (key: string) =>
        Effect.gen(function* () {
          return yield* localExecutionService.resolveFunction(key);
        }),
    } satisfies Context.Tag.Service<FunctionInvocationService>;
  }),
);

/**
 * Initializes FunctionInvocationServiceLayer with a loopback executor to run functions locally.
 */
export const FunctionInvocationServiceLayerWithLocalLoopbackExecutor = Layer.effect(
  FunctionInvocationService,
  Effect.gen(function* () {
    const functionInvocationService: Context.Tag.Service<FunctionInvocationService> =
      yield* FunctionInvocationService.pipe(
        Effect.provide(
          FunctionInvocationServiceLayer.pipe(
            Layer.provide(LocalFunctionExecutionService.layerLive),
            Layer.provide(
              Layer.succeed(FunctionInvocationService, {
                invokeFunction: (...args) => functionInvocationService.invokeFunction(...args),
                resolveFunction: (...args) => functionInvocationService.resolveFunction(...args),
              }),
            ),
          ),
        ),
      );

    return functionInvocationService;
  }),
);

/**
 * Layer for testing with optional function implementations.
 */
// TODO(dmaretskyi): Don't provide `FunctionImplementationResolver`.
export const FunctionInvocationServiceLayerTest = ({
  functions = [],
}: {
  functions?: readonly FunctionDefinition.Any[];
} = {}): Layer.Layer<
  FunctionInvocationService,
  never,
  AiService.AiService | CredentialsService | Database.Service | QueueService | Feed.Service
> =>
  FunctionInvocationServiceLayerWithLocalLoopbackExecutor.pipe(
    Layer.provide(FunctionImplementationResolver.layerTest({ functions })),
    Layer.provide(RemoteFunctionExecutionService.layerMock),
  );

/**
 * @deprecated Use {@link FunctionInvocationServiceLayerTest} instead.
 * Layer for testing with all services mocked/unavailable.
 */
// TODO(dmaretskyi): This shouldn't default to all services being not available.
// TODO(dmaretskyi): Don't provide `FunctionImplementationResolver`.
export const FunctionInvocationServiceLayerTestMocked = ({
  functions,
}: {
  functions?: readonly FunctionDefinition.Any[];
}): Layer.Layer<FunctionInvocationService> =>
  FunctionInvocationServiceLayerTest({ functions }).pipe(
    Layer.provide(AiService.notAvailable),
    Layer.provide(CredentialsService.configuredLayer([])),
    Layer.provide(Database.notAvailable),
    Layer.provide(QueueService.notAvailable),
    Layer.provide(Feed.notAvailable),
  );
