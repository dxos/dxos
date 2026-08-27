//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import type * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import type * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import * as RpcSerialization from 'effect/unstable/rpc/RpcSerialization';

import { type Client } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { type ProcessManager, type RemoteProcessManager } from '@dxos/compute-runtime';
import { RemoteProcessManagerAdapter } from '@dxos/compute-runtime/remote-process';
import type * as Process from '@dxos/compute/Process';
import { Context as DxosContext } from '@dxos/context';
import type { EdgeProcessHttpClient } from '@dxos/edge-client/process';
import type { SpaceId } from '@dxos/keys';
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
export const make = (getEdgeClient: () => EdgeProcessHttpClient, spaceId: SpaceId): RemoteProcessManager.Control => ({
  spawn: (request: ProcessProtocol.SpawnProcessRequest) =>
    Effect.tryPromise(() => getEdgeClient().spawnProcess(DxosContext.default(), spaceId, request)).pipe(
      Effect.map((response) => response.info),
      Effect.orDie,
    ),

  list: (query?: ProcessProtocol.ListProcessesQuery) =>
    Effect.tryPromise(() => getEdgeClient().listProcesses(DxosContext.default(), spaceId, query)).pipe(
      Effect.map((response) => response.processes),
      Effect.orDie,
    ),

  status: (pid: Process.ID) =>
    Effect.tryPromise(() => getEdgeClient().getProcess(DxosContext.default(), spaceId, pid)).pipe(Effect.orDie),

  submitInput: (pid: Process.ID, input: unknown) =>
    Effect.tryPromise(() => getEdgeClient().submitProcessInput(DxosContext.default(), spaceId, pid, { input })).pipe(
      Effect.orDie,
    ),

  terminate: (pid: Process.ID) =>
    Effect.tryPromise(() => getEdgeClient().terminateProcess(DxosContext.default(), spaceId, pid)).pipe(Effect.orDie),

  readEvents: (pid: Process.ID, cursor: number) =>
    Effect.tryPromise(() => getEdgeClient().readProcessEvents(DxosContext.default(), spaceId, pid, cursor)).pipe(
      Effect.orDie,
    ),

  makeRpcClient: <Rpcs extends Rpc.Any>(
    pid: Process.ID,
    group: RpcGroup.RpcGroup<Rpcs>,
  ): Effect.Effect<RpcClient.RpcClient<Rpcs>, never, Scope.Scope> =>
    Effect.gen(function* () {
      const url = getEdgeClient().processRpcUrl(spaceId, pid).toString();
      // The endpoint is served by an `RpcServer` in the process's host, so this is effect's own
      // rpc-over-HTTP rather than a hand-rolled envelope: request and response schemas are encoded
      // by the group itself. Auth is minted per request, since the header expires.
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
 * Space-scoped process control: presents the EDGE process host as a local
 * {@link ProcessManager.Manager}, so a stack written for the in-process manager — notably
 * `AgentService.layer` — runs against EDGE by swapping this layer in. Processes are per-space, which
 * is why this is scoped where the monitor above is not.
 */
export const processManagerFromEdgeClient = (
  edgeClient: EdgeProcessHttpClient,
  spaceId: SpaceId,
): Layer.Layer<ProcessManager.Service, never, Registry.AtomRegistry> =>
  RemoteProcessManagerAdapter.layer(make(() => edgeClient, spaceId));

/**
 * Build from a `Client`, deferring edge-client creation until first use (identity may be absent at
 * boot).
 */
export const processManagerFromClient = (
  client: Client,
  spaceId: SpaceId,
): Layer.Layer<ProcessManager.Service, never, Registry.AtomRegistry> => {
  let cached: EdgeProcessHttpClient | undefined;
  return RemoteProcessManagerAdapter.layer(
    make(() => {
      cached ??= createEdgeProcessClient(client);
      // Re-applied on every access: the cached client would otherwise keep presenting a header
      // minted for a previous identity.
      cached.setIdentity(createEdgeIdentity(client));
      return cached;
    }, spaceId),
  );
};
