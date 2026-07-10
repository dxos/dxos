//
// Copyright 2026 DXOS.org
//

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcServer from '@effect/rpc/RpcServer';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as Scope from 'effect/Scope';

export type ServeRpcGroupOptions = {
  disableTracing?: boolean;
  concurrency?: number | 'unbounded';
};

// Merged rpc groups (e.g. ClientServicesRpcs) do not structurally satisfy RpcGroup<Rpc.Any>
// in @effect/rpc's type parameter; runtime dispatch accepts any RpcGroup instance.
const asRpcGroup = <G>(group: G): Parameters<typeof RpcClient.make>[0] =>
  group as Parameters<typeof RpcClient.make>[0];

/**
 * Builds an effect-native RPC client over a {@link MessagePort} using the native Worker platform
 * protocol (structured-clone frames, transferables supported).
 */
export const makeRpcClient = <G>(
  port: MessagePort,
  group: G,
  options?: Pick<ServeRpcGroupOptions, 'disableTracing'>,
): Effect.Effect<unknown, never, Scope.Scope> =>
  Effect.gen(function* () {
    const clientLayer = RpcClient.layerProtocolWorker({ size: 1 }).pipe(
      Layer.provide(BrowserWorker.layerPlatform(() => port)),
    );
    return yield* RpcClient.make(asRpcGroup(group), { disableTracing: options?.disableTracing ?? true }).pipe(
      Effect.provide(clientLayer),
      Effect.orDie,
    );
  });

export type RpcGroupServer = {
  open(): Promise<void>;
  close(): Promise<void>;
};

/**
 * Serves an {@link RpcGroup} on a {@link MessagePort} via the native Worker runner protocol.
 */
export const serveRpcGroup = <G, H extends Layer.Layer<never, never, never>>(
  port: MessagePort,
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
      }).pipe(
        Layer.provide(handlers),
        Layer.provide(
          RpcServer.layerProtocolWorkerRunner.pipe(Layer.provide(BrowserWorkerRunner.layerMessagePort(port))),
        ),
        Layer.orDie,
      );

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
