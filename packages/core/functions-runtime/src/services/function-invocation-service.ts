//
// Copyright 2025 DXOS.org
//
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { AiService } from '@dxos/ai';
import { Context as DxosContext } from '@dxos/context';
import { FunctionInvocationService } from '@dxos/functions';
import { Operation } from '@dxos/operation';

import { LocalFunctionExecutionService } from './local-function-execution';
import type { RemoteFunctionExecutionService as RemoteFunctionExecutionServiceType } from './remote-function-execution-service';

type RemoteService = Context.Tag.Service<RemoteFunctionExecutionServiceType>;
const RemoteFunctionExecutionServiceTag: Context.Tag<RemoteFunctionExecutionServiceType, RemoteService> =
  Context.GenericTag('@dxos/functions/RemoteFunctionExecutionService');

/**
 * Layer that provides FunctionInvocationService implementation routing between local and remote execution.
 */
export const FunctionInvocationServiceLayer = Layer.effect(
  FunctionInvocationService,
  Effect.gen(function* () {
    const localExecutionService = yield* LocalFunctionExecutionService;
    const remoteExecutionService = yield* RemoteFunctionExecutionServiceTag;

    return {
      invokeFunction: <I, O>(functionDef: Operation.Definition<I, O, any>, input: I): Effect.Effect<O> =>
        Effect.gen(function* () {
          if (functionDef.meta?.deployedId) {
            return yield* remoteExecutionService.callFunction<I, O>(
              DxosContext.default(),
              functionDef.meta.deployedId,
              input,
            );
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
