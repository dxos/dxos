//
// Copyright 2025 DXOS.org
//
import { Context, Effect, Layer } from 'effect';

import { type FunctionError } from '../errors';
import { type FunctionDefinition } from '../handler';

import {
  FunctionImplementationResolver,
  type InvocationServices,
  LocalFunctionExecutionService,
} from './local-function-execution';
import { RemoteFunctionExecutionService } from './remote-function-execution-service';
import { type Services } from './service-container';

export class FunctionInvocationService extends Context.Tag('@dxos/functions/FunctionInvocationService')<
  FunctionInvocationService,
  {
    invokeFunction<I, O>(
      functionDef: FunctionDefinition<I, O>,
      input: I,
      deployedFunctionId?: string,
    ): Effect.Effect<O, FunctionError, InvocationServices>;
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
        ): Effect.Effect<O, FunctionError, InvocationServices> =>
          Effect.gen(function* () {
            if (deployedFunctionId) {
              return yield* remoteExecutioner.callFunction<I, O>(deployedFunctionId, input);
            }

            return yield* localExecutioner.invokeFunction(functionDef, input);
          }),
      } satisfies Context.Tag.Service<FunctionInvocationService>;
    }),
  );

  static layerTest: ({
    functions,
  }: {
    functions: FunctionDefinition<any, any>[];
  }) => Layer.Layer<FunctionInvocationService, FunctionError, Services> = ({ functions }) =>
    FunctionInvocationService.layer.pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          RemoteFunctionExecutionService.layerMock,
          LocalFunctionExecutionService.layerLive.pipe(
            Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions })),
          ),
        ),
      ),
    );
}
