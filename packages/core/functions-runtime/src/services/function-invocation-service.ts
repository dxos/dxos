//
// Copyright 2025 DXOS.org
//
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { DatabaseService } from '@dxos/echo-db';
import { CredentialsService, FunctionInvocationService, QueueService } from '@dxos/functions';

import { type FunctionDefinition } from '@dxos/functions';

import {
  FunctionImplementationResolver,
  type InvocationServices,
  LocalFunctionExecutionService,
} from './local-function-execution';
import { RemoteFunctionExecutionService } from './remote-function-execution-service';

/**
 * Layer that provides FunctionInvocationService implementation routing between local and remote execution.
 */
export const FunctionInvocationServiceLayer = Layer.effect(
  FunctionInvocationService,
  Effect.gen(function* () {
    const localExecutioner = yield* LocalFunctionExecutionService;
    const remoteExecutioner = yield* RemoteFunctionExecutionService;

    return {
      invokeFunction: <I, O>(
        functionDef: FunctionDefinition<I, O>,
        input: I,
      ): Effect.Effect<O, never, InvocationServices> =>
        Effect.gen(function* () {
          if (functionDef.meta?.deployedFunctionId) {
            return yield* remoteExecutioner.callFunction<I, O>(functionDef.meta.deployedFunctionId, input);
          }

          return yield* localExecutioner.invokeFunction(functionDef, input);
        }),
    } satisfies Context.Tag.Service<FunctionInvocationService>;
  }),
);

// TODO(dmaretskyi): Don't provide `FunctionImplementationResolver`.
/**
 * Layer for testing with optional function implementations.
 */
export const FunctionInvocationServiceLayerTest = ({
  functions = [],
}: {
  functions?: readonly FunctionDefinition<any, any>[];
} = {}): Layer.Layer<
  FunctionInvocationService,
  never,
  AiService.AiService | CredentialsService | DatabaseService | QueueService
> =>
  FunctionInvocationServiceLayer.pipe(
    Layer.provide(LocalFunctionExecutionService.layerLive),
    Layer.provide(FunctionImplementationResolver.layerTest({ functions })),
    Layer.provide(RemoteFunctionExecutionService.layerMock),
  );

// TODO(dmaretskyi): This shouldn't default to all services being not available.
// TODO(dmaretskyi): Don't provide `FunctionImplementationResolver`.
/**
 * @deprecated Use {@link FunctionInvocationServiceLayerTest} instead.
 * Layer for testing with all services mocked/unavailable.
 */
export const FunctionInvocationServiceLayerTestMocked = ({
  functions,
}: {
  functions?: readonly FunctionDefinition<any, any>[];
}): Layer.Layer<FunctionInvocationService> =>
  FunctionInvocationServiceLayerTest({ functions }).pipe(
    Layer.provide(AiService.notAvailable),
    Layer.provide(CredentialsService.configuredLayer([])),
    Layer.provide(DatabaseService.notAvailable),
    Layer.provide(QueueService.notAvailable),
  );
