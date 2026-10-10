//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Client, ClientService } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { RemoteOperationInvoker } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import { type Context as DxosContext } from '@dxos/context';
import { type SpaceId } from '@dxos/keys';

import { createEdgeClient } from './edge-client.ts';

type EdgeClient = ReturnType<typeof createEdgeClient>;

const make = (getEdgeClient: () => EdgeClient, spaceId?: SpaceId): RemoteOperationInvoker.Invoker => ({
  invoke: (
    ctx: DxosContext,
    deployedId: string,
    input: unknown,
    options?: RemoteOperationInvoker.InvokeOptions,
  ): Effect.Effect<unknown> =>
    Effect.gen(function* () {
      const cleanedId = deployedId.replace(/^\//, '');
      return yield* Effect.promise(() =>
        getEdgeClient().invokeFunction(ctx, { functionId: cleanedId, spaceId: options?.spaceId ?? spaceId }, input),
      ).pipe(Effect.mapError(Operation.FunctionError.wrap()), Effect.orDie);
    }),
});

/**
 * For tests: provide a pre-built edge client.
 */
export const fromEdgeClient = (
  edgeClient: EdgeClient,
  spaceId?: SpaceId,
): Layer.Layer<RemoteOperationInvoker.Service> =>
  Layer.succeed(
    RemoteOperationInvoker.Service,
    make(() => edgeClient, spaceId),
  );

/**
 * Build from a `Client`, deferring edge-client creation until first invoke.
 */
export const fromClient = (client: Client, spaceId?: SpaceId): Layer.Layer<RemoteOperationInvoker.Service> =>
  Layer.succeed(RemoteOperationInvoker.Service, make(cachedEdgeClient(client), spaceId));

/**
 * Build from the ambient `ClientService`.
 */
export const layer = (spaceId?: SpaceId): Layer.Layer<RemoteOperationInvoker.Service, never, ClientService> =>
  Layer.effect(
    RemoteOperationInvoker.Service,
    Effect.gen(function* () {
      const client = yield* ClientService;
      return make(cachedEdgeClient(client), spaceId);
    }),
  );

/**
 * The edge client, created on first use (identity may be absent at boot) and given the current identity on every
 * use: a cached client would otherwise keep presenting a header minted for a previous identity.
 */
const cachedEdgeClient = (client: Client): (() => EdgeClient) => {
  let cached: EdgeClient | undefined;
  return () => {
    cached ??= createEdgeClient(client);
    cached.setIdentity(createEdgeIdentity(client));
    return cached;
  };
};
