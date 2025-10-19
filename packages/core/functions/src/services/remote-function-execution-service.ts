//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type { SpaceId } from '@dxos/keys';

import { FunctionError } from '../errors';
import { getInvocationUrl } from '../url';

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
  static fromClient(baseUrl: string, spaceId?: SpaceId): Layer.Layer<RemoteFunctionExecutionService> {
    return Layer.succeed(RemoteFunctionExecutionService, {
      callFunction: <I, O>(deployedFunctionId: string, input: I): Effect.Effect<O> =>
        Effect.gen(function* () {
          const url = getInvocationUrl(deployedFunctionId, baseUrl, { spaceId });
          const result = yield* Effect.promise(() =>
            fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(input),
            }),
          );
          if (result.status >= 300 || result.status < 200) {
            const text = yield* Effect.promise(() => result.text());
            return yield* Effect.die(
              new FunctionError({
                message: 'Failed to invoke function',
                cause: new Error(`HTTP error: ${text}`),
              }),
            );
          }
          const data = (yield* Effect.promise(() => result.json())) as O;
          return data;
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
