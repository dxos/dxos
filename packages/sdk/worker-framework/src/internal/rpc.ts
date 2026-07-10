//
// Copyright 2026 DXOS.org
//

import * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcServer from '@effect/rpc/RpcServer';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as Scope from 'effect/Scope';

import { type RpcPort, layerProtocolRpcPortServer, makeProtocolRpcPortClient } from '@dxos/rpc';

export type ServeRpcGroupOptions = {
  disableTracing?: boolean;
  concurrency?: number | 'unbounded';
};

// Merged rpc groups (e.g. ClientServicesRpcs) do not structurally satisfy RpcGroup<Rpc.Any>
// in @effect/rpc's type parameter; runtime dispatch accepts any RpcGroup instance.
const asRpcGroup = <G>(group: G): Parameters<typeof RpcClient.make>[0] =>
  group as Parameters<typeof RpcClient.make>[0];

/**
 * Builds an effect-native RPC client over an {@link RpcPort} for the given {@link RpcGroup}.
 * The returned scope owns the connection; closing it releases the transport.
 */
export const makeRpcClient = <G>(
  port: RpcPort,
  group: G,
  options?: Pick<ServeRpcGroupOptions, 'disableTracing'>,
): Effect.Effect<unknown, never, Scope.Scope> =>
  Effect.gen(function* () {
    const protocol = yield* makeProtocolRpcPortClient(port);
    return yield* RpcClient.make(asRpcGroup(group), { disableTracing: options?.disableTracing ?? true }).pipe(
      Effect.provideService(RpcClient.Protocol, protocol),
    );
  });

export type RpcGroupServer = {
  open(): Promise<void>;
  close(): Promise<void>;
};

/**
 * Serves an {@link RpcGroup} over an {@link RpcPort} via effect-rpc.
 */
export const serveRpcGroup = <G, H extends Layer.Layer<never, never, never>>(
  port: RpcPort,
  group: G,
  handlers: H,
  options?: ServeRpcGroupOptions,
): RpcGroupServer => {
  let runtime: ManagedRuntime.ManagedRuntime<never, never> | undefined;

  return {
    async open(): Promise<void> {
      if (runtime) {
        return;
      }

      const serverLayer = RpcServer.layer(asRpcGroup(group), {
        disableTracing: options?.disableTracing ?? true,
        concurrency: options?.concurrency ?? 'unbounded',
      }).pipe(Layer.provide(handlers), Layer.provide(layerProtocolRpcPortServer(port)), Layer.orDie);

      runtime = ManagedRuntime.make(serverLayer);
      await runtime.runPromise(Effect.void);
    },

    async close(): Promise<void> {
      const current = runtime;
      runtime = undefined;
      await current?.dispose();
    },
  };
};
