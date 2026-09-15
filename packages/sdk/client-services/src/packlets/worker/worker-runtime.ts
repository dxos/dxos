//
// Copyright 2022 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import type * as RpcServer from 'effect/unstable/rpc/RpcServer';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { Trigger } from '@dxos/async';
import {
  ClientRpcServer,
  type ClientServicesHandlers,
  PROXY_CONNECTION_TIMEOUT,
  makeBridgeServiceClientOverProtocol,
} from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { Event } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, setIdentityTags } from '@dxos/messaging';
import { RtcTransportProxyFactory } from '@dxos/network-manager';
import { makeInProcessClient } from '@dxos/protocols';
import { DevicesService, IdentityService, type WorkerService } from '@dxos/protocols/rpc';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';

import {
  ClientServicesLayer,
  type ClientServicesStackContext,
  HostEvents,
  enableNetworking,
  handlersFromStack,
  wipeSqliteStorage,
} from '../services/index.ts';
import { SessionClosed } from './events.ts';

// Session transports are effect-rpc protocol layers handed over by the worker framework: appProtocol
// serves the client services (+ WorkerService); systemProtocol carries the reverse-direction
// BridgeService (worker→tab).
export type CreateSessionProps = {
  /** Forward-direction (tab→worker) protocol over which the worker serves the client services. */
  appProtocol: RpcServer.Protocol['Service'];
  /** Reverse-direction (worker→tab) protocol serving the tab's WebRTC `BridgeService`; the worker is the client. */
  systemProtocol: RpcClient.Protocol['Service'];
};

/** A tab connection within the worker; it lives as long as the scope `createSession` ran in. */
export interface WorkerSession {
  readonly origin?: string;
  /** The tab's WebRTC bridge, which the worker's network stack proxies through. */
  readonly bridgeService: Awaited<ReturnType<typeof makeBridgeServiceClientOverProtocol>>['bridgeService'];
  /** Completes when the tab asks to stop or its liveness lock releases; the caller then closes the scope. */
  readonly closed: Effect.Effect<void>;
}

/**
 * Grace period between "worker booted" and the first edge dial. wa-sqlite runs in-process on this
 * thread, so the dial, its auth-header request, and the replication behind it contend with the boot
 * RPCs the tab is waiting on — on a document-heavy profile the session handshake loses that race and
 * the client reports a connect timeout. Yielding lets the queued handshake drain first; replication
 * then proceeds behind a live session. The stack exposes the capability; the embedder decides the timing.
 */
const EDGE_NETWORKING_START_DELAY = '300 millis';

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
  sqliteLayer?: Layer.Layer<SqlClient.SqlClient | SqlExport.SqlExport, unknown>;

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
  /** Effect context of the running stack: every component and RPC handler. */
  readonly stack: () => Context.Context<ClientServicesStackContext>;
  /** Open a tab session over the supplied effect-rpc protocols for the life of the scope, registered for WebRTC bridging. */
  readonly createSession: (props: CreateSessionProps) => Effect.Effect<WorkerSession, never, Scope.Scope>;
  /** Route the WebRTC bridge through the given session (or disconnect when `undefined`). */
  readonly connectWebrtcBridge: (session: WorkerSession | undefined) => Effect.Effect<void>;
}

/**
 * Context tag for the dedicated-worker runtime service. Provided by {@link layerWorkerRuntime}.
 */
export class WorkerRuntime extends Context.Service<WorkerRuntime, WorkerRuntimeService>()(
  '@dxos/client-services/WorkerRuntime',
) {}

/**
 * Builds and opens the worker runtime: {@link ClientServicesLayer} over the worker's SQLite layer.
 * Never fails: startup errors are surfaced to session callers via the readiness gate. Closing the
 * scope tears everything down.
 */
export const makeWorkerRuntime = ({
  configProvider,
  requestShutdown = Effect.void,
  automaticallyConnectWebrtc = true,
  sqliteLayer,
  memorySignalManagerContext,
}: WorkerRuntimeOptions): Effect.Effect<WorkerRuntimeService, never, Scope.Scope> =>
  Effect.gen(function* () {
    const transportFactory = new RtcTransportProxyFactory();
    const ready = new Trigger<Error | undefined>();
    const sessions = new Set<WorkerSession>();
    const signalMetadataTags: any = { runtime: 'worker-runtime' };
    const scope = yield* Effect.scope;

    /** Outlives the stack: the reset chain and session events run on it. */
    const bus = Event.makeBus();

    let sessionForNetworking: WorkerSession | undefined;
    /** Owns the built stack; a reset closes it early, otherwise it closes with the runtime scope. */
    const stackScope = yield* Scope.fork(scope);
    let stack: Context.Context<ClientServicesStackContext> | undefined;

    if (sqliteLayer) {
      log.warn('Using testing SQLite layer');
    }

    const sqlite = SqlTransaction.layer.pipe(
      Layer.provideMerge(sqliteLayer ?? LocalSqliteOpfsLayer),
      Layer.provideMerge(Reactivity.layer),
      Layer.orDie,
    );

    const closeStack = Effect.gen(function* () {
      stack = undefined;
      yield* Scope.close(stackScope, Exit.void);
    });

    /** Wipes persisted storage over a SQLite layer of its own, since the stack's is gone by the time a reset gets here. */
    const wipeStorage = wipeSqliteStorage.pipe(Effect.provide(sqlite), Effect.orDie);

    const services = (): Partial<ClientServicesHandlers> => (stack ? handlersFromStack(stack) : {});

    const connectBridge = (session: WorkerSession | undefined): void => {
      sessionForNetworking = session;
      transportFactory.setBridgeService(session?.bridgeService);
    };

    // Selects one of the existing sessions for WebRTC networking.
    const reconnectWebrtc = Effect.sync(() => {
      log('reconnecting webrtc...');
      // Drop the current session if it has since closed.
      if (sessionForNetworking && !sessions.has(sessionForNetworking)) {
        sessionForNetworking = undefined;
      }
      if (!sessionForNetworking) {
        connectBridge(Array.from(sessions).find((session) => session.bridgeService));
      }
    });

    // The runtime's own subscriptions: the reset chain and session bookkeeping.
    yield* Effect.gen(function* () {
      yield* Event.on(HostEvents.Closing, () => closeStack);
      yield* Event.on(HostEvents.WipingStorage, () => wipeStorage);
      yield* Event.on(HostEvents.Reset, () => requestShutdown);
      yield* Event.on(
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
    }).pipe(Effect.provideService(Event.Bus, bus));

    yield* Effect.gen(function* () {
      log('starting...');
      const config = yield* configProvider;
      const observabilityGroup = config.get('runtime.client.observabilityGroup');
      if (observabilityGroup) {
        signalMetadataTags.group = observabilityGroup;
      }

      log('worker-runtime: building client services stack');
      const stackContext = yield* Layer.build(
        ClientServicesLayer({
          config,
          bus,
          // The dial is driven below once boot has drained, not on stack open.
          autoConnect: false,
          // Auto-activate spaces that were previously active after leader changeover.
          runtimeProps: { autoActivateSpaces: true },
          // Edge signaling is created by the platform layer from the edge connection; otherwise fall
          // back to an in-memory manager (KUBE `WebsocketSignalManager` removed).
          signalManager: config.get('runtime.client.edgeFeatures')?.signaling
            ? undefined
            : new MemorySignalManager(memorySignalManagerContext ?? new MemorySignalManagerContext()),
          transportFactory,
        }).pipe(Layer.provideMerge(sqlite)),
      ).pipe(Scope.provide(stackScope));
      stack = stackContext;
      log('worker-runtime: stack built, opening');
      // `StackOpened` resolves once every handler the cascade triggered has run.
      yield* Effect.gen(function* () {
        yield* Event.emit(HostEvents.Opening, undefined);
        yield* Event.emit(HostEvents.StackOpened, undefined);
      }).pipe(Effect.provide(stackContext));
      log('worker-runtime: stack opened, signalling ready');
      ready.wake(undefined);
      log('started');

      // Bridge the identity/devices Handlers to the effect-rpc client surface in-process.
      const [identityService, devicesService] = yield* Effect.all([
        makeInProcessClient(IdentityService.Rpcs, Context.get(stackContext, IdentityService.Tag)),
        makeInProcessClient(DevicesService.Rpcs, Context.get(stackContext, DevicesService.Tag)),
      ]);
      setIdentityTags({
        identityService,
        devicesService,
        setTag: (key: string, value: string) => {
          signalMetadataTags[key] = value;
        },
      });

      // Boot is done: outbound traffic can no longer starve the session handshake the tab is
      // waiting on. Anchored here rather than in the stack so the gate opens only after the whole
      // worker start sequence has drained, not just the stack open. The grace period yields the
      // thread so any RPC already queued behind this turn is served before the dial and its
      // auth-header request start competing for it.
      log.info('worker-runtime: boot complete, scheduling networking start', {
        delay: EDGE_NETWORKING_START_DELAY,
      });
      const networkingFiber = yield* Effect.forkDetach(
        Effect.gen(function* () {
          yield* Effect.sleep(EDGE_NETWORKING_START_DELAY);
          log('worker-runtime: starting networking');
          yield* enableNetworking;
        }).pipe(Effect.provide(stackContext)),
      );
      yield* Effect.addFinalizer(() => Fiber.interrupt(networkingFiber));
    }).pipe(
      Effect.catchCause((cause) =>
        Effect.gen(function* () {
          const error = Cause.squash(cause);
          ready.wake(error instanceof Error ? error : new Error(String(error)));
          log.error('starting', error);
          yield* closeStack;
        }),
      ),
    );

    const createSession = ({
      appProtocol,
      systemProtocol,
    }: CreateSessionProps): Effect.Effect<WorkerSession, never, Scope.Scope> =>
      Effect.gen(function* () {
        log('opening session...');
        const closeRequested = yield* Deferred.make<void>();
        const started = yield* Deferred.make<{ origin: string; lockKey?: string }>();

        const { bridgeService } = yield* Effect.acquireRelease(
          Effect.promise(() => makeBridgeServiceClientOverProtocol(systemProtocol)),
          ({ close }) => Effect.promise(() => close()),
        );

        // Per-session `WorkerService` control handlers, served alongside the client services. `start`
        // conveys the tab origin and liveness lock; `stop` ends the session.
        const workerServiceHandlers: WorkerService.Handlers = {
          'WorkerService.start': (payload) =>
            Deferred.succeed(started, { origin: payload.origin, lockKey: payload.lockKey }).pipe(Effect.asVoid),
          'WorkerService.stop': () =>
            // Resolve on the next tick so the RPC response is delivered before the transport tears down.
            Effect.forkDetach(
              Effect.callback<void>((resume) => {
                setTimeout(() => resume(Effect.void));
              }).pipe(Effect.andThen(Deferred.succeed(closeRequested, undefined))),
            ).pipe(Effect.asVoid),
        };

        yield* Effect.acquireRelease(
          Effect.promise(async () => {
            const server = new ClientRpcServer({
              services: () => ({ ...services(), WorkerService: workerServiceHandlers }),
              protocol: appProtocol,
              // Hold requests until the worker runtime is ready; propagate startup errors to callers.
              onRequest: async () => {
                const error = await ready.wait({ timeout: PROXY_CONNECTION_TIMEOUT });
                if (error) {
                  throw error;
                }
              },
            });
            await server.open();
            return server;
          }),
          (server) => Effect.promise(() => server.close()),
        );

        // Wait until the tab calls `WorkerService.start`.
        const { origin, lockKey } = yield* Deferred.await(started).pipe(
          Effect.timeout(PROXY_CONNECTION_TIMEOUT),
          Effect.orDie,
        );

        if (lockKey) {
          // The tab is gone once its liveness lock releases.
          const lockFiber = yield* Effect.forkDetach(
            Effect.promise(() =>
              navigator.locks.request(lockKey, () => {
                // No-op.
              }),
            ).pipe(Effect.andThen(Deferred.succeed(closeRequested, undefined))),
          );
          yield* Effect.addFinalizer(() => Fiber.interrupt(lockFiber));
        }

        // A worker can only service one origin currently.
        invariant(
          !signalMetadataTags.origin || signalMetadataTags.origin === origin,
          `worker origin changed from ${signalMetadataTags.origin} to ${origin}?`,
        );
        signalMetadataTags.origin = origin;

        const session: WorkerSession = { origin, bridgeService, closed: Deferred.await(closeRequested) };
        sessions.add(session);
        yield* Effect.addFinalizer(() =>
          Event.emit(SessionClosed, { session }).pipe(
            Effect.provideService(Event.Bus, bus),
            // A subscriber failing must not keep the transport open.
            Effect.catchCause((cause) => Effect.sync(() => log.catch(cause))),
          ),
        );

        if (automaticallyConnectWebrtc) {
          yield* reconnectWebrtc;
        }

        log('session opened', { origin });
        return session;
      });

    return {
      stack: () => {
        invariant(stack, 'worker runtime not started');
        return stack;
      },
      createSession,
      connectWebrtcBridge: (session) => Effect.sync(() => connectBridge(session)),
    } satisfies WorkerRuntimeService;
  });

/**
 * Layer providing the {@link WorkerRuntime} service; the runtime lives as long as the layer.
 */
export const layerWorkerRuntime = (options: WorkerRuntimeOptions): Layer.Layer<WorkerRuntime> =>
  Layer.effect(WorkerRuntime, makeWorkerRuntime(options));

const DB_NAME = 'DXOS';

/**
 * SqlExport layer that wraps SqliteClient to provide export functionality.
 */
const SqlExportLayer: Layer.Layer<SqlExport.SqlExport, never, SqliteClient.SqliteClient> = Layer.effect(
  SqlExport.SqlExport,
  Effect.gen(function* () {
    const sql = yield* SqliteClient.SqliteClient;
    return {
      export: sql.export,
    } satisfies SqlExport.Service;
  }),
);

/**
 * Local SQLite layer for the worker.
 * Uses in-process OPFS via {@link SqliteClient.layerOpfs} (no MessagePort).
 * NOTE: Only usable within a worker.
 */
const LocalSqliteOpfsLayer = SqlExportLayer.pipe(
  Layer.provideMerge(SqliteClient.layerOpfs({ dbName: DB_NAME })),
  Layer.provideMerge(Reactivity.layer),
);
