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
    // TODO(dmaretskyi): Services should be satisfied from environment rather then bubbled up.
    invokeFunction<I, O>(functionDef: FunctionDefinition<I, O>, input: I): Effect.Effect<O>;
  }
>() {
  static layer = Layer.effect(
    FunctionInvocationService,
    Effect.gen(function* () {
      const resolver = yield* FunctionImplementationResolver;
      const localExecutioner = yield* LocalFunctionExecutionService;
      const remoteExecutioner = yield* RemoteFunctionExecutionService;

      return {
        invokeFunction: <I, O>(functionDef: FunctionDefinition<I, O>, input: I): Effect.Effect<O> =>
          Effect.gen(function* () {
            const resolved = yield* resolver.resolveFunctionImplementation(functionDef).pipe(Effect.either);
            if (resolved._tag === 'Right') {
              return yield* localExecutioner.invokeFunction(resolved.right as any, input as any);
            }
            return yield* Effect.promise(() =>
              remoteExecutioner.callFunction(functionDef.key ?? functionDef.name, input),
            );
          }) as Effect.Effect<O>,
      } satisfies Context.Tag.Service<FunctionInvocationService>;
    }),
  );

  static layerTest = FunctionInvocationService.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        RemoteFunctionExecutionService.layerMock,
        LocalFunctionExecutionService.layerLive.pipe(
          // TODO(mykola): Will fail if functions are not provided.
          Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions: [] })),
        ),
      ),
    ),
  ) satisfies Layer.Layer<FunctionInvocationService>;

  static fromClient = (baseUrl: string, spaceId: SpaceId) =>
    FunctionInvocationService.layer.pipe(
      Layer.provide(
        Layer.mergeAll(
          Layer.succeed(RemoteFunctionExecutionService, RemoteFunctionExecutionService.fromClient(baseUrl, spaceId)),
          LocalFunctionExecutionService.layerLive.pipe(
            // TODO(mykola): Will fail if functions are not provided.
            Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions: [] })),
          ),
        ),
      ),
    ) satisfies Layer.Layer<FunctionInvocationService>;
}
