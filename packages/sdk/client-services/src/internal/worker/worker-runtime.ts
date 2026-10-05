//
// Copyright 2022 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Reactivity from 'effect/reactivity/Reactivity';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcServer from 'effect/rpc/RpcServer';
import * as Scope from 'effect/Scope';
import type * as SqlClient from 'effect/sql/SqlClient';

import { Trigger } from '@dxos/async';
import { PROXY_CONNECTION_TIMEOUT, makeRtcServiceClientOverProtocol } from '@dxos/client-protocol';
import { LayerStack } from '@dxos/compute-runtime';
import { type Config, ConfigService } from '@dxos/config';
import { Hook } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type MemorySignalManagerContext } from '@dxos/messaging';
import { RtcTransportProxyFactory } from '@dxos/network-manager';
import { WorkerRuntimeStartError } from '@dxos/protocols';
import { type RTCService } from '@dxos/protocols/rpc';
import { RpcRouter } from '@dxos/rpc';

import * as Events from '../../Events.ts';
import * as SqliteStorage from '../../SqliteStorage.ts';
import { layerClientServices } from '../services/index.ts';
import { SessionClosed } from './events.ts';
import { type SqliteLayer, layerSqlite, openStack, signalMetadataTags, workerStackOptions } from './worker-services.ts';

// Session transports are effect-rpc protocol layers handed over by the worker framework: appProtocol
// serves the client services; systemProtocol carries the reverse-direction
// RTCService (worker→tab).
export type CreateSessionProps = {
  /** Forward-direction (tab→worker) protocol over which the worker serves the client services. */
  appProtocol: RpcServer.Protocol['Service'];
  /** Reverse-direction (worker→tab) protocol serving the tab's WebRTC `RTCService`; the worker is the client. */
  systemProtocol: RpcClient.Protocol['Service'];
};

/** A tab connection within the worker; it lives as long as the scope `createSession` ran in. */
export interface WorkerSession {
  /** The tab's WebRTC service, which the worker's network stack proxies through. */
  readonly rtcService: RTCService.Client;
}

export type WorkerRuntimeOptions = {
  configProvider: Effect.Effect<Config>;
  /** The runtime wants to terminate (its last session closed, or a reset finished); the embedder closes its scope. */
  requestShutdown?: Effect.Effect<void>;
  /**
   * @default true
   */
  automaticallyConnectWebrtc?: boolean;

  /**
   * Optional SQLite layer for Effect. Defaults to LocalSqliteOpfsLayer.
   * For testing in Node.js, use `sqliteLayerMemory` from `@dxos/sql-sqlite/platform`.
   */
  sqliteLayer?: SqliteLayer;

  /**
   * Shared context for the in-memory signal manager used when edge signaling is off; tests pass one
   * so several runtimes can see each other.
   */
  memorySignalManagerContext?: MemorySignalManagerContext;
};

/**
 * Effect service surface for the dedicated-worker runtime.
 *
 * Manages connections from proxies (in tabs): tabs make requests to the client services stack, and
 * provide a WebRTC gateway. The runtime lives as long as the scope it was made in.
 */
export interface WorkerRuntimeService {
  /** The running stack; resolve a tag through it to reach a component or RPC handler. */
  readonly stack: () => LayerStack.LayerStack;
  /** Open a tab session over the supplied effect-rpc protocols for the life of the scope, registered for WebRTC bridging. */
  readonly createSession: (props: CreateSessionProps) => Effect.Effect<WorkerSession, never, Scope.Scope>;
  /** Route WebRTC through the given session (or disconnect when `undefined`). */
  readonly connectWebrtc: (session: WorkerSession | undefined) => Effect.Effect<void>;
}

/**
 * Context tag for the dedicated-worker runtime service. Provided by {@link layerWorkerRuntime}.
 */
export class WorkerRuntime extends Context.Service<WorkerRuntime, WorkerRuntimeService>()(
  '@dxos/client-services/WorkerRuntime',
) {}

/**
 * Builds and opens the worker runtime: {@link layerClientServices} over the worker's SQLite layer.
 * A startup error rejects the readiness gate, closes the stack and fails the effect, so the worker
 * reports it instead of advertising `ready`. Closing the scope tears everything down.
 */
export const makeWorkerRuntime = ({
  configProvider,
  requestShutdown = Effect.void,
  automaticallyConnectWebrtc = true,
  sqliteLayer,
  memorySignalManagerContext,
}: WorkerRuntimeOptions): Effect.Effect<WorkerRuntimeService, WorkerRuntimeStartError, Scope.Scope> =>
  Effect.gen(function* () {
    // Held so effects that outlive this construction — a session finalizer, which the framework runs
    // when it closes a session scope — still reach the controller.
    const controller = yield* Hook.Controller;
    const transportFactory = new RtcTransportProxyFactory();
    const ready = new Trigger<Error | undefined>();
    const sessions = new Set<WorkerSession>();
    const scope = yield* Effect.scope;

    let sessionForNetworking: WorkerSession | undefined;
    /** Owns the built stack; a reset closes it early, otherwise it closes with the runtime scope. */
    const stackScope = yield* Scope.fork(scope);
    let stack: LayerStack.LayerStack | undefined;

    if (sqliteLayer) {
      log.warn('Using testing SQLite layer');
    }

    const sqlite = layerSqlite(sqliteLayer);

    const closeStack = Effect.gen(function* () {
      stack = undefined;
      yield* Scope.close(stackScope, Exit.void);
    });

    const connectRtc = (session: WorkerSession | undefined): void => {
      sessionForNetworking = session;
      transportFactory.setRtcService(session?.rtcService);
    };

    // Selects one of the existing sessions for WebRTC networking.
    const reconnectWebrtc = Effect.sync(() => {
      log('reconnecting webrtc...');
      // Drop the current session if it has since closed.
      if (sessionForNetworking && !sessions.has(sessionForNetworking)) {
        sessionForNetworking = undefined;
      }
      if (!sessionForNetworking) {
        connectRtc(Array.from(sessions).find((session) => session.rtcService));
      }
    });

    // The runtime's own subscriptions: the reset chain and session bookkeeping.
    yield* Hook.on(Events.Closing, () => closeStack);
    /** Wipes persisted storage over a SQLite layer of its own, since the stack's is gone by the time a reset gets here. */
    yield* Hook.on(Events.WipingStorage, () =>
      SqliteStorage.wipeSqliteStorage.pipe(Effect.provide(sqlite), Effect.orDie),
    );
    yield* Hook.on(Events.Reset, () => requestShutdown);
    yield* Hook.on(
      SessionClosed,
      Effect.fn('WorkerRuntime.onSessionClosed')(function* ({ session }) {
        sessions.delete(session);
        if (sessions.size === 0) {
          // Terminate the worker when all sessions are closed.
          yield* requestShutdown;
        } else if (automaticallyConnectWebrtc) {
          yield* reconnectWebrtc;
        }
      }),
    );

    yield* Effect.gen(function* () {
      log('starting...');
      const config = yield* configProvider;

      log('worker-runtime: building client services stack');
      // Building the layer also builds its eager specs, so the rpc registrations are in place before
      // the stack opens.
      const stackContext = yield* Layer.build(
        layerClientServices(workerStackOptions({ config, transportFactory, memorySignalManagerContext })).pipe(
          Layer.provide(sqlite),
          Layer.provide(Layer.succeed(ConfigService, config)),
          Layer.provide(Layer.succeed(Hook.Controller, controller)),
        ),
      ).pipe(Scope.provide(stackScope));
      const built = Context.get(stackContext, LayerStack.Service);
      stack = built;
      log('worker-runtime: stack built, opening');
      // Anchored after the whole worker start sequence, not just the stack build, so networking
      // starts only once boot has drained.
      yield* openStack(built, signalMetadataTags(config)).pipe(
        Effect.provideService(Hook.Controller, controller),
        Scope.provide(stackScope),
      );
      ready.wake(undefined);
      log('started');
    }).pipe(
      Effect.catchCause((cause) =>
        Effect.gen(function* () {
          const squashed = Cause.squash(cause);
          const error = new WorkerRuntimeStartError({
            message: squashed instanceof Error ? squashed.message : String(squashed),
            cause: squashed,
          });
          ready.wake(error);
          log.error('starting', error);
          yield* closeStack;
          return yield* Effect.fail(error);
        }),
      ),
    );

    const createSession = ({
      appProtocol,
      systemProtocol,
    }: CreateSessionProps): Effect.Effect<WorkerSession, never, Scope.Scope> =>
      Effect.gen(function* () {
        log('opening session...');
        const rtcService = yield* makeRtcServiceClientOverProtocol(systemProtocol);

        // Serve once the runtime is ready; the handlers come from the stack's tags.
        const error = yield* Effect.promise(() => ready.wait({ timeout: PROXY_CONNECTION_TIMEOUT }));
        if (error || !stack) {
          return yield* Effect.die(error ?? new Error('worker runtime stack is not available'));
        }
        // Every service registered itself with the stack's router; the session only attaches its
        // transport, so adding a service never touches this code.
        const router = yield* stack
          .getServiceResolver()
          .resolve(RpcRouter.RpcRouter, {})
          .pipe(Effect.orDie, Effect.scoped);
        yield* Layer.build(
          RpcRouter.layerTransport.pipe(
            Layer.provide(Layer.succeed(RpcServer.Protocol, appProtocol)),
            Layer.provide(Layer.succeed(RpcRouter.RpcRouter, router)),
          ),
        );

        const session: WorkerSession = { rtcService };
        sessions.add(session);
        yield* Effect.addFinalizer(() =>
          Hook.emit(SessionClosed, { session }).pipe(
            Effect.provideService(Hook.Controller, controller),
            // A subscriber failing must not keep the transport open.
            Effect.catchCause((cause) => Effect.sync(() => log.catch(cause))),
          ),
        );

        if (automaticallyConnectWebrtc) {
          yield* reconnectWebrtc;
        }

        log('session opened');
        return session;
      });

    return {
      stack: () => {
        invariant(stack, 'worker runtime not started');
        return stack;
      },
      createSession,
      connectWebrtc: (session) => Effect.sync(() => connectRtc(session)),
    } satisfies WorkerRuntimeService;
  }).pipe(Effect.provide(Hook.controllerLayer));

/**
 * Layer providing the {@link WorkerRuntime} service; the runtime lives as long as the layer.
 */
export const layerWorkerRuntime = (
  options: WorkerRuntimeOptions,
): Layer.Layer<WorkerRuntime, WorkerRuntimeStartError> => Layer.effect(WorkerRuntime, makeWorkerRuntime(options));
