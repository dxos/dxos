//
// Copyright 2025 DXOS.org
//
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';

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
    invokeFunction<I, O>(functionDef: FunctionDefinition<I, O>, input: I): Effect.Effect<O, never, InvocationServices>;
  }
>() {
  static invokeFunction = Effect.serviceFunctionEffect(FunctionInvocationService, (_) => _.invokeFunction);

  static layer = Layer.effect(
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
  static layerTest = ({
    functions = [],
  }: {
    functions?: FunctionDefinition<any, any>[];
  } = {}): Layer.Layer<
    FunctionInvocationService,
    never,
    AiService.AiService | CredentialsService | DatabaseService | QueueService
  > =>
    FunctionInvocationService.layer.pipe(
      Layer.provide(LocalFunctionExecutionService.layerLive),
      Layer.provide(FunctionImplementationResolver.layerTest({ functions })),
      Layer.provide(RemoteFunctionExecutionService.layerMock),
    );

  // TODO(dmaretskyi): This shouldn't default to all services being not available.
  // TODO(dmaretskyi): Don't provide `FunctionImplementationResolver`.
  /**
   * @deprecated Use {@link layerTest} instead.
   */
  static layerTestMocked = ({
    functions,
  }: {
    functions: FunctionDefinition<any, any>[];
  }): Layer.Layer<FunctionInvocationService> =>
    FunctionInvocationService.layerTest({ functions }).pipe(
      Layer.provide(AiService.notAvailable),
      Layer.provide(CredentialsService.configuredLayer([])),
      Layer.provide(DatabaseService.notAvailable),
      Layer.provide(QueueService.notAvailable),
    );
}
