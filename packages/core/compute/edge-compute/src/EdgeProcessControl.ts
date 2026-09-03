//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import type * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import type * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import * as RpcSerialization from 'effect/unstable/rpc/RpcSerialization';

import { type Client } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { type RemoteProcessManager } from '@dxos/compute-runtime';
import type * as Process from '@dxos/compute/Process';
import { Context as DxosContext } from '@dxos/context';
import type { EdgeProcessHttpClient } from '@dxos/edge-client/process';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import type { ProcessProtocol } from '@dxos/protocols';

import { createEdgeProcessClient } from './edge-client';

/**
 * EDGE implementation of {@link RemoteProcessManager.Control}: the seven compute-service process
 * routes, addressed within one space.
 *
 * Every verb is `Effect.tryPromise(...).pipe(Effect.orDie)` — the interface carries no error channel
 * (matching the local `ProcessManager.Manager`), so a transport or host failure is a defect. This is
 * deliberately unlike `EdgeTriggerManager`'s polls, which swallow failures: a spawn or an input that
 * silently did nothing would leave the caller waiting on a process that does not exist.
 */
export const make = (getEdgeClient: () => EdgeProcessHttpClient): RemoteProcessManager.Control => ({
  spawn: (space: string, request: ProcessProtocol.SpawnProcessRequest) =>
    Effect.tryPromise(() => getEdgeClient().spawnProcess(DxosContext.default(), requireSpaceId(space), request)).pipe(
      Effect.map((response) => response.info),
      Effect.orDie,
    ),

  list: (space: string, query?: ProcessProtocol.ListProcessesQuery) =>
    Effect.tryPromise(() => getEdgeClient().listProcesses(DxosContext.default(), requireSpaceId(space), query)).pipe(
      Effect.map((response) => response.processes),
      Effect.orDie,
    ),

  status: (space: string, pid: Process.ID) =>
    Effect.tryPromise(() => getEdgeClient().getProcess(DxosContext.default(), requireSpaceId(space), pid)).pipe(
      Effect.orDie,
    ),

  submitInput: (space: string, pid: Process.ID, input: unknown) =>
    Effect.tryPromise(() =>
      getEdgeClient().submitProcessInput(DxosContext.default(), requireSpaceId(space), pid, { input }),
    ).pipe(Effect.orDie),

  terminate: (space: string, pid: Process.ID) =>
    Effect.tryPromise(() => getEdgeClient().terminateProcess(DxosContext.default(), requireSpaceId(space), pid)).pipe(
      Effect.orDie,
    ),

  readEvents: (space: string, pid: Process.ID, cursor: number) =>
    Effect.tryPromise(() =>
      getEdgeClient().readProcessEvents(DxosContext.default(), requireSpaceId(space), pid, cursor),
    ).pipe(Effect.orDie),

  makeRpcClient: <Rpcs extends Rpc.Any>(
    space: string,
    pid: Process.ID,
    group: RpcGroup.RpcGroup<Rpcs>,
  ): Effect.Effect<RpcClient.RpcClient<Rpcs>, never, Scope.Scope> =>
    Effect.gen(function* () {
      const url = getEdgeClient().processRpcUrl(requireSpaceId(space), pid).toString();
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
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.provide(RpcSerialization.layerNdjson), Effect.orDie),
});
/**
 * The interface carries spaces as plain strings (to stay free of `@dxos/keys` value imports), so the
 * transport is where one is validated — a malformed id would otherwise reach the host as a route
 * segment and come back as an opaque 404.
 */
const requireSpaceId = (space: string): SpaceId => {
  invariant(SpaceId.isValid(space), `Invalid space id: ${space}`);
  return space;
};

/**
 * Build from a `Client`, deferring edge-client creation until first use (identity may be absent at
 * boot). Consumed by `EdgeProcessManager.forSpace`, which is what a stack provides — this returns
 * the `Control` surface, not a manager: `RemoteProcessManager.Service` is the tag that means
 * "processes on EDGE".
 */
export const fromClient = (client: Client): RemoteProcessManager.Control => {
  let cached: EdgeProcessHttpClient | undefined;
  return make(() => {
    cached ??= createEdgeProcessClient(client);
    // Re-applied on every access: the cached client would otherwise keep presenting a header
    // minted for a previous identity.
    cached.setIdentity(createEdgeIdentity(client));
    return cached;
  });
};
