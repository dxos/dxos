//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';
import * as Layer from 'effect/Layer';
import type * as Rpc from 'effect/rpc/Rpc';
import * as RpcClient from 'effect/rpc/RpcClient';
import type * as RpcGroup from 'effect/rpc/RpcGroup';
import * as RpcSerialization from 'effect/rpc/RpcSerialization';
import type * as Scope from 'effect/Scope';

import { type Client } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { RemoteCommandRejectedError, type RemoteProcessManager } from '@dxos/compute-runtime';
import { Context as DxosContext } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { EdgeCallFailedError } from '@dxos/protocols';

import { createEdgeClient } from './edge-client.ts';
import { decodeEvent, decodeSnapshot, toSpawnRequest } from './process-snapshot.ts';

/**
 * 4xx statuses that are not a refusal: an expired credential (re-authenticated on the next call), a
 * timeout, and rate limiting all clear up on their own.
 */
const TRANSIENT_CLIENT_STATUSES = new Set([401, 408, 425, 429]);

/**
 * Whether EDGE refused the request outright — an unknown process key, a malformed request, a caller
 * without access — so sending it again would be refused again.
 */
const isRejection = (error: unknown): boolean =>
  error instanceof EdgeCallFailedError &&
  error.status !== undefined &&
  error.status >= 400 &&
  error.status < 500 &&
  !TRANSIENT_CLIENT_STATUSES.has(error.status);

/**
 * Calls EDGE, dying with what it threw: a refusal as {@link RemoteCommandRejectedError}, which a retrying
 * caller (`QueuedRemoteControl`) must not retry, and anything else as is.
 */
const call = <A>(request: () => Promise<A>): Effect.Effect<A> =>
  Effect.tryPromise(request).pipe(
    Effect.mapError(({ cause }) => (isRejection(cause) ? RemoteCommandRejectedError.wrap()(cause) : cause)),
    Effect.orDie,
  );

/**
 * EDGE implementation of {@link RemoteProcessManager.Control}: the seven compute-service process
 * routes, addressed within one space.
 *
 * Every verb dies on failure — the interface carries no error channel (matching the local
 * `ProcessManager.Manager`), so a transport or host failure is a defect. This is deliberately unlike
 * `EdgeTriggerManager`'s polls, which swallow failures: a spawn or an input that silently did nothing
 * would leave the caller waiting on a process that does not exist.
 */
export const make = (getEdgeClient: () => EdgeHttpClient): RemoteProcessManager.Control => ({
  spawn: ({ spaceId, ...request }: RemoteProcessManager.SpawnRequest) =>
    call(() => getEdgeClient().spawnProcess(DxosContext.default(), spaceId, toSpawnRequest(request))).pipe(
      Effect.map((response) => decodeSnapshot(response.info)),
    ),

  list: ({ spaceId, ...query }: RemoteProcessManager.ListRequest) =>
    call(() => getEdgeClient().listProcesses(DxosContext.default(), spaceId, query)).pipe(
      Effect.map((response) => response.processes.map(decodeSnapshot)),
    ),

  status: ({ spaceId, pid }: RemoteProcessManager.ProcessTarget) =>
    call(() => getEdgeClient().getProcess(DxosContext.default(), spaceId, pid)).pipe(Effect.map(decodeSnapshot)),

  submitInput: ({
    spaceId,
    pid,
    input,
    idempotencyKey,
  }: RemoteProcessManager.ProcessTarget & RemoteProcessManager.Idempotent & { readonly input: unknown }) =>
    call(() =>
      getEdgeClient().submitProcessInput(DxosContext.default(), spaceId, pid, {
        input,
        ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
      }),
    ),

  terminate: ({ spaceId, pid, idempotencyKey }: RemoteProcessManager.ProcessTarget & RemoteProcessManager.Idempotent) =>
    call(() =>
      getEdgeClient().terminateProcess(
        DxosContext.default(),
        spaceId,
        pid,
        idempotencyKey !== undefined ? { idempotencyKey } : undefined,
      ),
    ),

  readEvents: ({ spaceId, pid, cursor }: RemoteProcessManager.ProcessTarget & { readonly cursor: number }) =>
    call(() => getEdgeClient().readProcessEvents(DxosContext.default(), spaceId, pid, cursor)).pipe(
      Effect.map((response): RemoteProcessManager.EventPage => ({
        events: response.events.map(decodeEvent),
        cursor: response.cursor,
        truncated: response.truncated,
        snapshot: decodeSnapshot(response.info),
      })),
    ),

  makeRpcClient: <Rpcs extends Rpc.Any>({
    spaceId,
    pid,
    group,
  }: RemoteProcessManager.ProcessTarget & { readonly group: RpcGroup.RpcGroup<Rpcs> }): Effect.Effect<
    RpcClient.RpcClient<Rpcs>,
    never,
    Scope.Scope
  > =>
    Effect.gen(function* () {
      const url = getEdgeClient().processRpcUrl(spaceId, pid).toString();
      // The host serves the endpoint with an `RpcServer`, so the group's own schemas encode the
      // payloads rather than a hand-rolled envelope.
      const httpClient = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequestEffect((request) =>
          // The client is resolved per request, not captured: an RPC client outlives an identity
          // change, and a captured one would keep presenting the previous identity's header.
          Effect.promise(() => getEdgeClient().getAuthHeader()).pipe(
            Effect.map((authHeader) =>
              HttpClientRequest.setUrl(
                authHeader ? HttpClientRequest.setHeader(request, 'Authorization', authHeader) : request,
                url,
              ),
            ),
          ),
        ),
      );

      return yield* RpcClient.make(group).pipe(
        Effect.provideServiceEffect(RpcClient.Protocol, RpcClient.makeProtocolHttp(httpClient)),
      );
    }).pipe(Effect.provide(Layer.provideMerge(FetchHttpClient.layer, RpcSerialization.layerNdjson)), Effect.orDie),
});
/**
 * Build from a `Client`, deferring edge-client creation until first use (identity may be absent at
 * boot). Consumed by `EdgeProcessManager.forSpace`, which is what a stack provides — this returns
 * the `Control` surface, not a manager: `RemoteProcessManager.Service` is the tag that means
 * "processes on EDGE".
 */
export const fromClient = (client: Client): RemoteProcessManager.Control => {
  let cached: EdgeHttpClient | undefined;
  return make(() => {
    cached ??= createEdgeClient(client);
    // Re-applied on every access: the cached client would otherwise keep presenting a header
    // minted for a previous identity.
    cached.setIdentity(createEdgeIdentity(client));
    return cached;
  });
};
