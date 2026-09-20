//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as Scope from 'effect/Scope';
import type * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import type * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import * as RpcMiddleware from 'effect/unstable/rpc/RpcMiddleware';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';

import { log } from '@dxos/log';
import { RpcRouter } from '@dxos/rpc';
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

// A middleware-wrapped group serves the same rpcs under the same tags, but no longer satisfies the
// type parameter the caller's handlers were built for.
const asServedGroup = <Rpcs extends Rpc.Any>(group: unknown): RpcGroup.RpcGroup<Rpcs> =>
  group as RpcGroup.RpcGroup<Rpcs>;

// Server-only: the client never sees this middleware, so it does not change the wire contract.
class DefectLogMiddleware extends RpcMiddleware.Service<DefectLogMiddleware>()('DxosRpcDefectLogMiddleware') {}

const defectLogLayer = Layer.succeed(DefectLogMiddleware, (handler, { rpc }) =>
  Effect.tapCause(handler, (cause) =>
    Cause.hasDies(cause)
      ? Effect.sync(() => log.error('rpc handler defect', { rpc: rpc._tag, cause: Cause.pretty(cause) }))
      : Effect.void,
  ),
);

const makeServerLayer = <G, ROut, R>(
  group: G,
  handlers: Layer.Layer<ROut, never, R>,
  options: ServeOptions | undefined,
) => {
  const timingEnabled = RpcTiming.isEnabled(options?.timing);
  const timedGroup = timingEnabled ? RpcTiming.applyMiddleware(asRpcGroup(group)) : asRpcGroup(group);
  const rpcGroup = asRpcGroup(timedGroup).middleware(DefectLogMiddleware);
  const handlersLayer = timingEnabled
    ? Layer.mergeAll(handlers, defectLogLayer, RpcTiming.serverLayer(RpcTiming.resolveOptions(options?.timing)))
    : Layer.merge(handlers, defectLogLayer);
  return RpcServer.layer(asRpcGroup(rpcGroup), {
    disableTracing: options?.disableTracing ?? true,
    concurrency: options?.concurrency ?? 'unbounded',
    // A defect fails only its own request; fatal defects fail every request and stream on the connection.
    disableFatalDefects: true,
  }).pipe(Layer.provide(handlersLayer));
};

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

    // Build the transport into the caller's scope (extended via `Scope.provide`) rather than
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
      Layer.provide(BrowserWorker.layer(() => port)),
    ),
    group,
    options,
  );

/**
 * Effect-native server for an {@link RpcGroup}: a layer that serves `group` with `handlers` over the
 * ambient {@link RpcServer.Protocol} for the life of the layer.
 */
export const serverLayer = <Rpcs extends Rpc.Any, R>(
  group: RpcGroup.RpcGroup<Rpcs>,
  handlers: Layer.Layer<Rpc.ToHandler<Rpcs> | Rpc.ServicesServer<Rpcs>, never, R>,
  options?: ServeOptions,
): Layer.Layer<never, never, RpcServer.Protocol | R> => makeServerLayer(group, handlers, options);

/**
 * Serves `group` with `handlers` over the ambient {@link RpcRouter.RpcRouter} for the current scope,
 * under the standard server middleware. Registration is per group, so nothing has to enumerate the
 * services a transport carries; {@link RpcRouter.layerTransport} serves whatever is registered.
 */
export const serveOnRouter = <Rpcs extends Rpc.Any, R>(
  prefix: string,
  group: RpcGroup.RpcGroup<Rpcs>,
  handlers: Layer.Layer<Rpc.ToHandler<Rpcs>, never, R>,
  options?: ServeOptions & Pick<RpcRouter.ServeOptions, 'inProcessClient'>,
): Effect.Effect<
  void,
  never,
  RpcRouter.RpcRouter | Scope.Scope | R | Rpc.ServicesServer<Rpcs> | Rpc.Middleware<Rpcs>
> => {
  // Timing is unconditional here: the middleware is `requiredForClient` and every client of a
  // router-served transport (the tab) applies it, so a group served without it would reject
  // every request.
  const timedGroup = RpcTiming.applyMiddleware(group);
  const rpcGroup = asServedGroup<Rpcs>(timedGroup.middleware(DefectLogMiddleware));
  return RpcRouter.serve(prefix, rpcGroup, {
    disableTracing: options?.disableTracing ?? true,
    concurrency: options?.concurrency ?? 'unbounded',
    // A defect fails only its own request; fatal defects fail every request and stream on the connection.
    disableFatalDefects: true,
    inProcessClient: options?.inProcessClient,
  }).pipe(
    Effect.provide(
      Layer.mergeAll(handlers, defectLogLayer, RpcTiming.serverLayer(RpcTiming.resolveOptions(options?.timing))),
    ),
  );
};

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

      const serverLayer = makeServerLayer(group, handlers, options).pipe(
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
 * Serves whatever is registered with `router` on a {@link MessagePort} via the native Worker runner
 * protocol — the transport half of a worker session, without the stack around it.
 */
export const serveRouterOnPort = (router: RpcRouter.Service, port: MessagePort): GroupServer => {
  let runtime: ManagedRuntime.ManagedRuntime<never, never> | undefined;

  return {
    async open(): Promise<void> {
      if (runtime) {
        return;
      }

      const current = ManagedRuntime.make(
        RpcRouter.layerTransport.pipe(
          Layer.provide(Layer.succeed(RpcRouter.RpcRouter, router)),
          Layer.provide(
            RpcServer.layerProtocolWorkerRunner.pipe(Layer.provide(BrowserWorkerRunner.layerMessagePort(port))),
          ),
          Layer.orDie,
        ),
      );
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
  // Cache the in-flight open so concurrent opens share one initialization and a close during open
  // can await it before disposing — otherwise `runtime` is unset mid-open and a fast open/close
  // (e.g. client restart) leaks the runtime.
  let openPromise: Promise<void> | undefined;

  return {
    async open(): Promise<void> {
      if (openPromise) {
        return openPromise;
      }

      openPromise = (async () => {
        const serverLayer = makeServerLayer(group, handlers, options).pipe(Layer.provide(protocol), Layer.orDie);

        const current = ManagedRuntime.make(serverLayer);
        try {
          await current.runPromise(Effect.void);
        } catch (error) {
          // Leave the server un-opened on startup failure so a later open() can retry.
          openPromise = undefined;
          await current.dispose();
          throw error;
        }
        runtime = current;
      })();
      return openPromise;
    },

    async close(): Promise<void> {
      if (openPromise) {
        // Wait for an in-flight open so we dispose the runtime it created rather than leaking it.
        await openPromise.catch(() => {});
        openPromise = undefined;
      }
      const current = runtime;
      runtime = undefined;
      await current?.dispose();
    },
  };
};
