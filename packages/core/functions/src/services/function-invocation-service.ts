//
// Copyright 2025 DXOS.org
//
import { Context, Effect, Layer } from 'effect';

import { AiService } from '@dxos/ai';

import { type FunctionError } from '../errors';
import { type FunctionDefinition } from '../handler';

import { CredentialsService } from './credentials';
import { DatabaseService } from './database';
import {
  FunctionImplementationResolver,
  type InvocationServices,
  LocalFunctionExecutionService,
} from './local-function-execution';
import { QueueService } from './queues';
import { RemoteFunctionExecutionService } from './remote-function-execution-service';

export class FunctionInvocationService extends Context.Tag('@dxos/functions/FunctionInvocationService')<
  FunctionInvocationService,
  {
    invokeFunction<I, O>(
      functionDef: FunctionDefinition<I, O>,
      input: I,
      deployedFunctionId?: string,
    ): Effect.Effect<O, never, InvocationServices>;
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
        ): Effect.Effect<O, never, InvocationServices> =>
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
  }) => Layer.Layer<FunctionInvocationService, FunctionError, InvocationServices> = ({ functions }) =>
    FunctionInvocationService.layer.pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          LocalFunctionExecutionService.layerLive.pipe(
            Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions })),
            Layer.provideMerge(AiService.notAvailable),
            Layer.provideMerge(CredentialsService.configuredLayer([])),
            Layer.provideMerge(DatabaseService.notAvailable),
            Layer.provideMerge(QueueService.notAvailable),
            Layer.provideMerge(RemoteFunctionExecutionService.layerMock),
          ),
        ),
      ),
    );
}
