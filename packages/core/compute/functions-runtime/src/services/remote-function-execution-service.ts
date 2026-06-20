//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { type Client, ClientService } from '@dxos/client';
import { FunctionError } from '@dxos/compute';
import { Context as DxosContext } from '@dxos/context';
import type { SpaceId } from '@dxos/keys';

import { createEdgeClient } from '../edge';

/**
 * Allows calling into other functions.
 */
export class RemoteFunctionExecutionService extends Context.Tag('@dxos/functions/RemoteFunctionExecutionService')<
  RemoteFunctionExecutionService,
  {
    callFunction<I, O>(ctx: DxosContext, deployedFunctionId: string, input: I): Effect.Effect<O>;
  }
>() {
  /**
   * @param baseUrl URL of the EDGE server.
   * @param spaceId - The space ID to invoke the function in. If not provided, the function will be without space context.
   * @returns
   */
  static fromClient(client: Client, spaceId?: SpaceId): Layer.Layer<RemoteFunctionExecutionService> {
    // Defer `createEdgeClient` until a function is actually called: the edge
    // client requires an identity, which may not exist when this layer is
    // first materialised (e.g. at app boot, before the create-identity
    // operation has run). Eager construction here used to silently fail the
    // entire LayerStack application slice with `Identity not available`.
    let cachedEdgeClient: ReturnType<typeof createEdgeClient> | undefined;
    const getEdgeClient = () => (cachedEdgeClient ??= createEdgeClient(client));
    return Layer.succeed(RemoteFunctionExecutionService, {
      callFunction: <I, O>(ctx: DxosContext, deployedFunctionId: string, input: I): Effect.Effect<O> =>
        Effect.gen(function* () {
          // TODO(dmaretskyi): Reconcile with `invokeFunction`.
          const cleanedId = deployedFunctionId.replace(/^\//, '');
          return yield* Effect.promise(() =>
            getEdgeClient().invokeFunction(ctx, { functionId: cleanedId, spaceId }, input),
          ).pipe(
            Effect.mapError(FunctionError.wrap()),
            Effect.orDie, // TODO(dmaretskyi): Checked error.
          );
        }),
    });
  }

  static withClient(
    spaceId$: Option.Option<SpaceId>,
  ): Layer.Layer<RemoteFunctionExecutionService, never, ClientService> {
    return Layer.effect(
      RemoteFunctionExecutionService,
      Effect.gen(function* () {
        const client = yield* ClientService;
        // See `fromClient` — defer until `callFunction` is invoked.
        let cachedEdgeClient: ReturnType<typeof createEdgeClient> | undefined;
        const getEdgeClient = () => (cachedEdgeClient ??= createEdgeClient(client));
        const spaceId = spaceId$.pipe(Option.getOrUndefined);

        return {
          callFunction: <I, O>(ctx: DxosContext, deployedFunctionId: string, input: I): Effect.Effect<O> =>
            Effect.gen(function* () {
              // TODO(dmaretskyi): Reconcile with `invokeFunction`.
              const cleanedId = deployedFunctionId.replace(/^\//, '');
              return yield* Effect.promise(() =>
                getEdgeClient().invokeFunction(ctx, { functionId: cleanedId, spaceId }, input),
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
      callFunction: <I, O>(_ctx: DxosContext, _deployedFunctionId: string, input: I): Effect.Effect<O> =>
        Effect.succeed(input as unknown as O),
    };
  };

  static layerMock = Layer.succeed(RemoteFunctionExecutionService, RemoteFunctionExecutionService.mock());
}
