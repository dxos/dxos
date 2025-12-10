//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import { type Client, ClientService } from '@dxos/client';
import { FunctionError } from '@dxos/functions';
import type { SpaceId } from '@dxos/keys';

import { createEdgeClient } from '../edge';

/**
 * Allows calling into other functions.
 */
export class RemoteFunctionExecutionService extends Context.Tag('@dxos/functions/RemoteFunctionExecutionService')<
  RemoteFunctionExecutionService,
  {
    callFunction<I, O>(deployedFunctionId: string, input: I): Effect.Effect<O>;
  }
>() {
  /**
   * @param baseUrl URL of the EDGE server.
   * @param spaceId - The space ID to invoke the function in. If not provided, the function will be without space context.
   * @returns
   */
  static fromClient(client: Client, spaceId?: SpaceId): Layer.Layer<RemoteFunctionExecutionService> {
    const edgeClient = createEdgeClient(client);
    return Layer.succeed(RemoteFunctionExecutionService, {
      callFunction: <I, O>(deployedFunctionId: string, input: I): Effect.Effect<O> =>
        Effect.gen(function* () {
          // TODO(dmaretskyi): Reconcile with `invokeFunction`.
          const cleanedId = deployedFunctionId.replace(/^\//, '');
          return yield* Effect.promise(() => edgeClient.invokeFunction({ functionId: cleanedId, spaceId }, input)).pipe(
            Effect.mapError(FunctionError.wrap()),
            Effect.orDie, // TODO(dmaretskyi): Checked error.
          );
        }),
    });
  }

  static withClient(
    spaceId$: Option.Option<SpaceId>,
    fallbackToDefaultSpace = false,
  ): Layer.Layer<RemoteFunctionExecutionService, never, ClientService> {
    return Layer.effect(
      RemoteFunctionExecutionService,
      Effect.gen(function* () {
        const client = yield* ClientService;
        const edgeClient = createEdgeClient(client);
        const spaceId = yield* Match.value(fallbackToDefaultSpace).pipe(
          Match.when(
            true,
            Effect.fnUntraced(function* () {
              yield* Effect.promise(() => client.spaces.waitUntilReady());
              return Option.getOrElse(spaceId$, () => client.spaces.default.id);
            }),
          ),
          Match.when(false, () => spaceId$.pipe(Option.getOrUndefined, Effect.succeed)),
          Match.exhaustive,
        );

        return {
          callFunction: <I, O>(deployedFunctionId: string, input: I): Effect.Effect<O> =>
            Effect.gen(function* () {
              // TODO(dmaretskyi): Reconcile with `invokeFunction`.
              const cleanedId = deployedFunctionId.replace(/^\//, '');
              return yield* Effect.promise(() =>
                edgeClient.invokeFunction({ functionId: cleanedId, spaceId }, input),
              ).pipe(
                Effect.mapError(FunctionError.wrap()),
                Effect.orDie, // TODO(dmaretskyi): Checked error.
              );
            }),
        };
      }),
    );
  }

  static mock = (): Context.Tag.Service<RemoteFunctionExecutionService> => {
    return {
      callFunction: <I, O>(deployedFunctionId: string, input: I): Effect.Effect<O> =>
        Effect.succeed(input as unknown as O),
    };
  };

  static layerMock = Layer.succeed(RemoteFunctionExecutionService, RemoteFunctionExecutionService.mock());
}
