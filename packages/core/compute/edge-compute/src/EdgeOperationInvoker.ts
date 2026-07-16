//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Client, ClientService } from '@dxos/client';
import { FunctionError } from '@dxos/compute';
import { RemoteOperationInvoker } from '@dxos/compute-runtime';
import { type Context as DxosContext } from '@dxos/context';
import { type SpaceId } from '@dxos/keys';

import { createEdgeClient } from './edge-client';

type EdgeClient = ReturnType<typeof createEdgeClient>;

const make = (getEdgeClient: () => EdgeClient, spaceId?: SpaceId): RemoteOperationInvoker.Invoker => ({
  invoke: <I, O>(ctx: DxosContext, deployedId: string, input: I): Effect.Effect<O> =>
    Effect.gen(function* () {
      const cleanedId = deployedId.replace(/^\//, '');
      return yield* Effect.promise(() =>
        getEdgeClient().invokeFunction(ctx, { functionId: cleanedId, spaceId }, input),
      ).pipe(
        Effect.mapError(FunctionError.wrap()),
        Effect.orDie,
      );
    }),
});

/**
 * For tests: provide a pre-built edge client.
 */
export const fromEdgeClient = (
  edgeClient: EdgeClient,
  spaceId?: SpaceId,
): Layer.Layer<RemoteOperationInvoker.Service> =>
  Layer.succeed(RemoteOperationInvoker.Service, make(() => edgeClient, spaceId));

/**
 * Build from a `Client`, deferring edge-client creation until first invoke
 * (identity may be absent at boot).
 */
export const fromClient = (client: Client, spaceId?: SpaceId): Layer.Layer<RemoteOperationInvoker.Service> => {
  let cached: EdgeClient | undefined;
  return Layer.succeed(
    RemoteOperationInvoker.Service,
    make(() => (cached ??= createEdgeClient(client)), spaceId),
  );
};

/**
 * Build from the ambient `ClientService`.
 */
export const layer = (spaceId?: SpaceId): Layer.Layer<RemoteOperationInvoker.Service, never, ClientService> =>
  Layer.effect(
    RemoteOperationInvoker.Service,
    Effect.gen(function* () {
      const client = yield* ClientService;
      let cached: EdgeClient | undefined;
      return make(() => (cached ??= createEdgeClient(client)), spaceId);
    }),
  );
