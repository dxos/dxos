//
// Copyright 2025 DXOS.org
//
import { Context, Effect, Layer } from 'effect';

import { type SpaceId } from '@dxos/keys';

import { type FunctionDefinition } from '../handler';

import { FunctionImplementationResolver, LocalFunctionExecutionService } from './local-function-execution';
import { RemoteFunctionExecutionService } from './remote-function-execution-service';

export class FunctionInvocationService extends Context.Tag('@dxos/functions/FunctionInvocationService')<
  FunctionInvocationService,
  {
    invokeFunction<I, O>(
      functionDef: FunctionDefinition<I, O>,
      input: I,
      deployedFunctionId?: string,
    ): Effect.Effect<O>;
  }
>() {
  static layer = Layer.effect(
    FunctionInvocationService,
    Effect.gen(function* () {
      const localExecutioner = yield* LocalFunctionExecutionService;
      const remoteExecutioner = yield* RemoteFunctionExecutionService;

      return {
        invokeFunction: <I, O>(
          functionDef: FunctionDefinition<I, O>,
          input: I,
          deployedFunctionId?: string,
        ): Effect.Effect<O> =>
          Effect.gen(function* () {
            if (deployedFunctionId) {
              return yield* Effect.promise(() => remoteExecutioner.callFunction(deployedFunctionId, input));
            }

            return yield* localExecutioner.invokeFunction(functionDef, input);
          }) as Effect.Effect<O>,
      } satisfies Context.Tag.Service<FunctionInvocationService>;
    }),
  );

  static layerTest = ({ functions }: { functions: FunctionDefinition<any, any>[] }) =>
    FunctionInvocationService.layer.pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          RemoteFunctionExecutionService.layerMock,
          LocalFunctionExecutionService.layerLive.pipe(
            Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions })),
          ),
        ),
      ),
    ) satisfies Layer.Layer<FunctionInvocationService>;

  static fromClient = (baseUrl: string, spaceId?: SpaceId) =>
    FunctionInvocationService.layer.pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          Layer.succeed(RemoteFunctionExecutionService, RemoteFunctionExecutionService.fromClient(baseUrl, spaceId)),
          LocalFunctionExecutionService.layerLive,
        ),
      ),
    ) satisfies Layer.Layer<FunctionInvocationService, never, FunctionImplementationResolver>;
}
