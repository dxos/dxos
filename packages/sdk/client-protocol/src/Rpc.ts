//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcServer from '@effect/rpc/RpcServer';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as Scope from 'effect/Scope';

import { RpcTiming } from '@dxos/worker-framework';

export type ServeOptions = {
  disableTracing?: boolean;
  concurrency?: number | 'unbounded';
  /**
   * When enabled, stamps each outbound RPC with a `Date.now()` send time and logs queue-wait /
   * service durations on the worker above {@link RpcTiming.Options.minLogMs} (default 100 ms).
   */
  timing?: boolean | RpcTiming.Options;
};

// A worker RPC client runs over a single MessagePort that multiplexes every request by id, so there
// is no real per-connection concurrency limit. The `@effect/rpc` worker protocol backs the client
// with a `Pool` that holds one worker for a request's whole lifetime — including long-lived streams.
// The pool's default concurrency of 1 therefore lets a single open stream (e.g. a subscription) block
// every other call. Allow effectively-unbounded concurrent requests over the one worker instead.
const WORKER_CLIENT_CONCURRENCY = Number.MAX_SAFE_INTEGER;

// Merged rpc groups (e.g. ClientServicesRpcs) do not structurally satisfy RpcGroup<Rpc.Any>
// in @effect/rpc's type parameter; runtime dispatch accepts any RpcGroup instance.
const asRpcGroup = <G>(group: G): Parameters<typeof RpcClient.make>[0] => group as Parameters<typeof RpcClient.make>[0];

/**
 * Builds an effect-native RPC client over a caller-supplied {@link RpcClient.Protocol} layer.
 * Transport-agnostic: consumers provide the Worker-platform protocol (see {@link makeClient}) or a
 * byte protocol over a legacy transport (e.g. `@dxos/rpc`'s RpcPort layer for iframe/devtools bridges).
 */
export const makeClientOverProtocol = <G, ProtocolError, ProtocolRequirements>(
  protocol: Layer.Layer<RpcClient.Protocol, ProtocolError, ProtocolRequirements>,
  group: G,
  options?: Pick<ServeOptions, 'disableTracing' | 'timing'>,
): Effect.Effect<unknown, never, Scope.Scope | ProtocolRequirements> =>
  Effect.gen(function* () {
    const timingEnabled = RpcTiming.isEnabled(options?.timing);
    const rpcGroup = timingEnabled ? RpcTiming.applyMiddleware(asRpcGroup(group)) : asRpcGroup(group);
    const protocolLayer = timingEnabled ? protocol.pipe(Layer.provideMerge(RpcTiming.clientLayer())) : protocol;

    // Build the transport into the caller's scope (extended via `Scope.extend`) rather than
    // `Effect.provide`-ing the layer directly: that would bind the transport's lifetime to this
    // construction effect, tearing the worker connection down the instant the client is returned
    // (the client is used later by the caller). `Layer.build` keeps it alive for the caller's scope.
    const context = yield* Layer.build(protocolLayer);
    return yield* RpcClient.make(asRpcGroup(rpcGroup), { disableTracing: options?.disableTracing ?? true }).pipe(
      Effect.provide(context),
    );
  }).pipe(Effect.orDie);

/**
 * Builds an effect-native RPC client over a {@link MessagePort} using the native Worker platform
 * protocol (structured-clone frames, transferables supported).
 */
export const makeClient = <G>(
  port: MessagePort,
  group: G,
  options?: Pick<ServeOptions, 'disableTracing' | 'timing'>,
): Effect.Effect<unknown, never, Scope.Scope> =>
  makeClientOverProtocol(
    RpcClient.layerProtocolWorker({ size: 1, concurrency: WORKER_CLIENT_CONCURRENCY }).pipe(
      Layer.provide(BrowserWorker.layerPlatform(() => port)),
    ),
    group,
    options,
  );

export type GroupServer = {
  open(): Promise<void>;
  close(): Promise<void>;
};

/**
 * Serves an {@link RpcGroup} on a {@link MessagePort} via the native Worker runner protocol.
 */
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
      // Merge the timing middleware layer into the handler layer (rather than a conditional
      // `.pipe(...)` element) so the pipeline stays a fixed tuple.
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
        // Leave the server un-opened on startup failure so a later open() can retry rather than
        // returning early against a runtime that never started.
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

/**
 * Serves an {@link RpcGroup} over a caller-supplied {@link RpcServer.Protocol} layer.
 * Transport-agnostic counterpart to {@link makeClientOverProtocol}: consumers provide a byte
 * protocol over a legacy transport (e.g. `@dxos/rpc`'s RpcPort layer for iframe/devtools bridges).
 */
export const serveOverProtocol = <G, H extends Layer.Layer<never, never, never>>(
  protocol: Layer.Layer<RpcServer.Protocol>,
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
      }).pipe(Layer.provide(handlersLayer), Layer.provide(protocol), Layer.orDie);

      const current = ManagedRuntime.make(serverLayer);
      try {
        await current.runPromise(Effect.void);
      } catch (error) {
        // Leave the server un-opened on startup failure so a later open() can retry.
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
