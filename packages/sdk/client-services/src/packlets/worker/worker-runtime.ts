//
// Copyright 2022 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { Trigger } from '@dxos/async';
import {
  PROXY_CONNECTION_TIMEOUT,
  layerClientServicesServer,
  layerHandlersFromTag,
  makeBridgeServiceClientOverProtocol,
} from '@dxos/client-protocol';
import { type Config, ConfigService } from '@dxos/config';
import { Hook } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, setIdentityTags } from '@dxos/messaging';
import { RtcTransportProxyFactory } from '@dxos/network-manager';
import { WorkerRuntimeStartError, makeInProcessClient } from '@dxos/protocols';
import {
  ContactsService,
  DataService,
  DevicesService,
  DevtoolsHost,
  EdgeAgentService,
  FeedService,
  IdentityService,
  InvitationsService,
  LoggingService,
  NetworkService,
  QueryService,
  SpacesService,
  SystemService,
} from '@dxos/protocols/rpc';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';

import {
  ClientServicesLayer,
  type ClientServicesStackContext,
  HostEvents,
  enableNetworking,
  wipeSqliteStorage,
} from '../services/index.ts';
import { SessionClosed } from './events.ts';

// Session transports are effect-rpc protocol layers handed over by the worker framework: appProtocol
// serves the client services; systemProtocol carries the reverse-direction
// BridgeService (worker→tab).
export type CreateSessionProps = {
  /** Forward-direction (tab→worker) protocol over which the worker serves the client services. */
  appProtocol: RpcServer.Protocol['Service'];
  /** Reverse-direction (worker→tab) protocol serving the tab's WebRTC `BridgeService`; the worker is the client. */
  systemProtocol: RpcClient.Protocol['Service'];
};

/** A tab connection within the worker; it lives as long as the scope `createSession` ran in. */
export interface WorkerSession {
  /** The tab's WebRTC bridge, which the worker's network stack proxies through. */
  readonly bridgeService: Awaited<ReturnType<typeof makeBridgeServiceClientOverProtocol>>['bridgeService'];
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
    const signalMetadataTags: any = {
      runtime: 'worker-runtime',
      origin: typeof location !== 'undefined' ? location.origin : 'unknown',
    };
    const scope = yield* Effect.scope;

    let sessionForNetworking: WorkerSession | undefined;
    /** Owns the built stack; a reset closes it early, otherwise it closes with the runtime scope. */
    const stackScope = yield* Scope.fork(scope);
    let stack: Context.Context<ClientServicesStackContext> | undefined;

    if (sqliteLayer) {
      log.warn('Using testing SQLite layer');
    }

    const sqlite = (sqliteLayer ?? LocalSqliteOpfsLayer).pipe(Layer.provideMerge(Reactivity.layer), Layer.orDie);

    const closeStack = Effect.gen(function* () {
      stack = undefined;
      yield* Scope.close(stackScope, Exit.void);
    });

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
    yield* Hook.on(HostEvents.Closing, () => closeStack);
    /** Wipes persisted storage over a SQLite layer of its own, since the stack's is gone by the time a reset gets here. */
    yield* Hook.on(HostEvents.WipingStorage, () => wipeSqliteStorage.pipe(Effect.provide(sqlite), Effect.orDie));
    yield* Hook.on(HostEvents.Reset, () => requestShutdown);
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
      const observabilityGroup = config.get('runtime.client.observabilityGroup');
      if (observabilityGroup) {
        signalMetadataTags.group = observabilityGroup;
      }

      log('worker-runtime: building client services stack');
      const stackContext = yield* Layer.build(
        ClientServicesLayer({
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
        }).pipe(
          Layer.provideMerge(sqlite),
          Layer.provide(Layer.succeed(ConfigService, config)),
          Layer.provide(Layer.succeed(Hook.Controller, controller)),
        ),
      ).pipe(Scope.provide(stackScope));
      stack = stackContext;
      log('worker-runtime: stack built, opening');
      // `StackOpened` resolves once every handler the cascade triggered has run.
      yield* Effect.gen(function* () {
        yield* Hook.emit(HostEvents.Opening, undefined);
        yield* Hook.emit(HostEvents.StackOpened, undefined);
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
        const { bridgeService } = yield* Effect.acquireRelease(
          Effect.promise(() => makeBridgeServiceClientOverProtocol(systemProtocol)),
          ({ close }) => Effect.promise(() => close()),
        );

        // Serve once the runtime is ready; the handlers come from the stack's tags.
        const error = yield* Effect.promise(() => ready.wait({ timeout: PROXY_CONNECTION_TIMEOUT }));
        if (error || !stack) {
          return yield* Effect.die(error ?? new Error('worker runtime stack is not available'));
        }
        yield* Layer.build(
          layerClientServicesServer(
            Layer.mergeAll(
              layerHandlersFromTag(SystemService.Rpcs, SystemService.Tag),
              layerHandlersFromTag(NetworkService.Rpcs, NetworkService.Tag),
              layerHandlersFromTag(LoggingService.Rpcs, LoggingService.Tag),
              layerHandlersFromTag(IdentityService.Rpcs, IdentityService.Tag),
              layerHandlersFromTag(InvitationsService.Rpcs, InvitationsService.Tag),
              layerHandlersFromTag(DevicesService.Rpcs, DevicesService.Tag),
              layerHandlersFromTag(SpacesService.Rpcs, SpacesService.Tag),
              layerHandlersFromTag(DataService.Rpcs, DataService.Tag),
              layerHandlersFromTag(QueryService.Rpcs, QueryService.Tag),
              layerHandlersFromTag(FeedService.Rpcs, FeedService.Tag),
              layerHandlersFromTag(ContactsService.Rpcs, ContactsService.Tag),
              layerHandlersFromTag(EdgeAgentService.Rpcs, EdgeAgentService.Tag),
              layerHandlersFromTag(DevtoolsHost.Rpcs, DevtoolsHost.Tag),
            ),
          ).pipe(
            Layer.provide(Layer.succeed(RpcServer.Protocol, appProtocol)),
            Layer.provide(Layer.succeedContext(stack)),
          ),
        );

        const session: WorkerSession = { bridgeService };
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
      connectWebrtcBridge: (session) => Effect.sync(() => connectBridge(session)),
    } satisfies WorkerRuntimeService;
  }).pipe(Effect.provide(Hook.controllerLayer));

/**
 * Layer providing the {@link WorkerRuntime} service; the runtime lives as long as the layer.
 */
export const layerWorkerRuntime = (
  options: WorkerRuntimeOptions,
): Layer.Layer<WorkerRuntime, WorkerRuntimeStartError> => Layer.effect(WorkerRuntime, makeWorkerRuntime(options));

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
