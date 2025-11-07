//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type { SpaceId } from '@dxos/keys';

import { FunctionError } from '@dxos/functions';
import { getInvocationUrl } from '../url';
import { type Client } from '@dxos/client';
import { createEdgeClient } from '../edge';
import { todo } from '@dxos/debug';

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

  static mock = (): Context.Tag.Service<RemoteFunctionExecutionService> => {
    return {
      callFunction: <I, O>(deployedFunctionId: string, input: I): Effect.Effect<O> =>
        Effect.succeed(input as unknown as O),
    };
  };

  static layerMock = Layer.succeed(RemoteFunctionExecutionService, RemoteFunctionExecutionService.mock());
}
