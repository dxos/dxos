//
// Copyright 2026 DXOS.org
//

// Internal effect-rpc-over-MessagePort composition used only by the package's own stories and the
// RpcTiming test to exercise the middleware end-to-end. The production composition lives in
// `@dxos/client-protocol` (`Rpc`); worker-framework itself is transport plumbing and does not expose
// this publicly.

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcServer from '@effect/rpc/RpcServer';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as Scope from 'effect/Scope';

import * as RpcTiming from '../RpcTiming';

export type ServeOptions = {
  disableTracing?: boolean;
  concurrency?: number | 'unbounded';
  timing?: boolean | RpcTiming.Options;
};

// A single MessagePort multiplexes every request by id, so allow effectively-unbounded concurrent
// requests over the one worker rather than the pool default of 1 (which lets one open stream block
// every other call).
const WORKER_CLIENT_CONCURRENCY = Number.MAX_SAFE_INTEGER;

const asRpcGroup = <G>(group: G): Parameters<typeof RpcClient.make>[0] => group as Parameters<typeof RpcClient.make>[0];

/** Builds an effect-native RPC client over a {@link MessagePort} using the native Worker protocol. */
export const makeClient = <G>(
  port: MessagePort,
  group: G,
  options?: Pick<ServeOptions, 'disableTracing' | 'timing'>,
): Effect.Effect<unknown, never, Scope.Scope> =>
  Effect.gen(function* () {
    const timingEnabled = RpcTiming.isEnabled(options?.timing);
    const rpcGroup = timingEnabled ? RpcTiming.applyMiddleware(asRpcGroup(group)) : asRpcGroup(group);
    const protocol = RpcClient.layerProtocolWorker({ size: 1, concurrency: WORKER_CLIENT_CONCURRENCY }).pipe(
      Layer.provide(BrowserWorker.layerPlatform(() => port)),
    );
    const protocolLayer = timingEnabled ? protocol.pipe(Layer.provideMerge(RpcTiming.clientLayer())) : protocol;
    const context = yield* Layer.build(protocolLayer);
    return yield* RpcClient.make(asRpcGroup(rpcGroup), { disableTracing: options?.disableTracing ?? true }).pipe(
      Effect.provide(context),
    );
  }).pipe(Effect.orDie);

export type GroupServer = {
  open(): Promise<void>;
  close(): Promise<void>;
};

/** Serves an RpcGroup on a {@link MessagePort} via the native Worker runner protocol. */
export const serve = <G, H extends Layer.Layer<never, never, never>>(
  port: MessagePort,
  group: G,
  handlers: H,
  options?: ServeOptions,
): GroupServer => {
  let runtime: ManagedRuntime.ManagedRuntime<never, never> | undefined;

  return {
    async open(): Promise<void> {
      if (runtime) {
        return;
      }

      const timingEnabled = RpcTiming.isEnabled(options?.timing);
      const rpcGroup = timingEnabled ? RpcTiming.applyMiddleware(asRpcGroup(group)) : asRpcGroup(group);
      const handlersLayer = timingEnabled
        ? Layer.merge(handlers, RpcTiming.serverLayer(RpcTiming.resolveOptions(options?.timing)))
        : handlers;
      const serverLayer = RpcServer.layer(asRpcGroup(rpcGroup), {
        disableTracing: options?.disableTracing ?? true,
        concurrency: options?.concurrency ?? 'unbounded',
      }).pipe(
        Layer.provide(handlersLayer),
        Layer.provide(
          RpcServer.layerProtocolWorkerRunner.pipe(Layer.provide(BrowserWorkerRunner.layerMessagePort(port))),
        ),
        Layer.orDie,
      );

      const current = ManagedRuntime.make(serverLayer);
      try {
        await current.runPromise(Effect.void);
      } catch (error) {
        await current.dispose();
        throw error;
      }
      runtime = current;
    },

    async close(): Promise<void> {
      const current = runtime;
      runtime = undefined;
      await current?.dispose();
    },
  };
};
