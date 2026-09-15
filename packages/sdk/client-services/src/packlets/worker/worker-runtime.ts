//
// Copyright 2022 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context_ from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Scope from 'effect/Scope';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import type * as RpcServer from 'effect/unstable/rpc/RpcServer';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { Trigger } from '@dxos/async';
import { type ClientServicesHandlers } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { EffectEx, Event } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, setIdentityTags } from '@dxos/messaging';
import { RtcTransportProxyFactory } from '@dxos/network-manager';
import { makeInProcessClient } from '@dxos/protocols';
import { SystemStatus } from '@dxos/protocols/buf/dxos/client/services_pb';
import { DevicesService, IdentityService } from '@dxos/protocols/rpc';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';
import { type MaybePromise } from '@dxos/util';

import {
  type CollectDiagnosticsBroadcastHandler,
  createCollectDiagnosticsBroadcastHandler,
  createDiagnosticsFromHandlers,
} from '../diagnostics/index.ts';
import {
  ClientServicesLayer,
  type ClientServicesStackContext,
  HostEvents,
  enableNetworking,
  handlersFromStack,
  wipeSqliteStorage,
} from '../services/index.ts';
import { SystemServiceImpl } from '../system/index.ts';
import { WorkerSession } from './worker-session.ts';

// Session transports are effect-rpc protocol layers handed over by the worker framework: appProtocol
// serves the client services (+ WorkerService); systemProtocol carries the reverse-direction
// BridgeService (worker→tab).
export type CreateSessionProps = {
  appProtocol: RpcServer.Protocol['Service'];
  systemProtocol: RpcClient.Protocol['Service'];
  shellPort?: MessagePort;
  onClose?: () => Promise<void>;
};

/**
 * Grace period between "worker booted" and the first edge dial. wa-sqlite runs in-process on this
 * thread, so the dial, its auth-header request, and the replication behind it contend with the boot
 * RPCs the tab is waiting on — on a document-heavy profile the session handshake loses that race and
 * the client reports a connect timeout. Yielding lets the queued handshake drain first; replication
 * then proceeds behind a live session. The stack exposes the capability; the embedder decides the timing.
 */
const EDGE_NETWORKING_START_DELAY = '300 millis';

export type WorkerRuntimeOptions = {
  configProvider: () => MaybePromise<Config>;
  acquireLock: () => Promise<void>;
  releaseLock: () => void;
  onStop?: () => Promise<void>;
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
 * provide a WebRTC gateway. Lifecycle (`start` / `stop`) is caller-driven — the worker framework
 * builds the runtime after receiving init config, then drives sessions for their lifetime — so these
 * are explicit programs rather than Layer finalizers.
 */
export interface WorkerRuntimeService {
  /** Effect context of the running stack: every component and RPC handler. Present once started. */
  readonly stack: () => Context_.Context<ClientServicesStackContext>;
  /** Resolve config, open the stack, and signal readiness. Never fails: startup errors are surfaced to session callers via the readiness gate. */
  readonly start: () => Effect.Effect<void>;
  /** Tear down the stack, release the storage lock, and run `onStop`. Idempotent. */
  readonly stop: () => Effect.Effect<void>;
  /** Open a new tab session over the supplied effect-rpc protocols and register it for WebRTC bridging. */
  readonly createSession: (props: CreateSessionProps) => Effect.Effect<WorkerSession>;
  /** Route the WebRTC bridge through the given session (or disconnect when `undefined`). */
  readonly connectWebrtcBridge: (session: WorkerSession | undefined) => Effect.Effect<void>;
}

/**
 * Context tag for the dedicated-worker runtime service. Provided by {@link layerWorkerRuntime}.
 */
export class WorkerRuntime extends Context_.Service<WorkerRuntime, WorkerRuntimeService>()(
  '@dxos/client-services/WorkerRuntime',
) {}

/**
 * Constructs the {@link WorkerRuntimeService}. The stack is built in {@link start} once config is
 * resolved: {@link ClientServicesLayer} over the worker's SQLite layer in one `ManagedRuntime`.
 */
export const makeWorkerRuntime = ({
  configProvider,
  acquireLock,
  releaseLock,
  onStop,
  automaticallyConnectWebrtc = true,
  sqliteLayer,
  memorySignalManagerContext,
}: WorkerRuntimeOptions): WorkerRuntimeService => {
  const transportFactory = new RtcTransportProxyFactory();
  const ready = new Trigger<Error | undefined>();
  const sessions = new Set<WorkerSession>();
  const signalMetadataTags: any = { runtime: 'worker-runtime' };

  let stopped = false;
  let sessionForNetworking: WorkerSession | undefined;
  let config: Config | undefined;
  let runtime: ManagedRuntime.ManagedRuntime<ClientServicesStackContext, never> | undefined;
  let stack: Context_.Context<ClientServicesStackContext> | undefined;
  let serviceScope: Scope.Closeable | undefined;
  let diagnosticsBroadcast: CollectDiagnosticsBroadcastHandler | undefined;
  /** The deferred networking start, interrupted if the worker is torn down mid-grace-period. */
  let networkingFiber: Fiber.Fiber<void> | undefined;

  if (sqliteLayer) {
    log.warn('Using testing SQLite layer');
  }

  const sqlite = () =>
    SqlTransaction.layer.pipe(
      Layer.provideMerge(sqliteLayer ?? LocalSqliteOpfsLayer),
      Layer.provideMerge(Reactivity.layer),
      Layer.orDie,
    );

  /** Disposes the stack runtime, and with it the SQLite layer. Idempotent. */
  const closeStack = Effect.gen(function* () {
    diagnosticsBroadcast?.stop();
    diagnosticsBroadcast = undefined;
    const current = runtime;
    runtime = undefined;
    stack = undefined;
    if (current) {
      yield* Effect.promise(() => current.dispose());
    }
    systemService.setStatus(SystemStatus.INACTIVE);
  });

  /** Wipes persisted storage over a SQLite layer of its own, since the stack's is gone by the time a reset gets here. */
  const wipeStorage = wipeSqliteStorage.pipe(Effect.provide(sqlite()));

  const services = (): Partial<ClientServicesHandlers> => ({
    SystemService: systemService,
    ...(stack ? handlersFromStack(stack) : {}),
  });

  const systemService = new SystemServiceImpl({
    config: () => config,
    getDiagnostics: () => {
      invariant(stack && config, 'worker runtime not started');
      return createDiagnosticsFromHandlers(services, stack, config);
    },
    close: () => EffectEx.runPromise(closeStack),
    wipeStorage: () => EffectEx.runPromise(wipeStorage),
    onReset: () => EffectEx.runPromise(stop()),
  });

  const stop = (): Effect.Effect<void> =>
    Effect.gen(function* () {
      if (stopped) {
        return;
      }
      stopped = true;
      if (networkingFiber) {
        yield* Fiber.interrupt(networkingFiber);
      }
      // Release the lock to notify remote clients that the worker is terminating.
      releaseLock();
      // Always run onStop, even if stack teardown fails — otherwise a failed close skips the shutdown signal.
      yield* Effect.gen(function* () {
        yield* closeStack;
        if (serviceScope) {
          yield* Scope.close(serviceScope, Exit.void);
          serviceScope = undefined;
        }
      }).pipe(Effect.ensuring(Effect.promise(async () => onStop?.())));
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

  const start = (): Effect.Effect<void> =>
    Effect.gen(function* () {
      log('starting...');
      log('worker-runtime: acquiring storage lock');
      yield* Effect.promise(() => acquireLock());
      log('worker-runtime: storage lock acquired, resolving config');
      const resolvedConfig = yield* Effect.promise(async () => configProvider());
      config = resolvedConfig;
      log('worker-runtime: config resolved');
      const observabilityGroup = resolvedConfig.get('runtime.client.observabilityGroup');
      if (observabilityGroup) {
        signalMetadataTags.group = observabilityGroup;
      }

      log('worker-runtime: building client services stack');
      const stackRuntime = ManagedRuntime.make(
        ClientServicesLayer({
          config: resolvedConfig,
          // The dial is driven below once boot has drained, not on stack open.
          autoConnect: false,
          // Auto-activate spaces that were previously active after leader changeover.
          runtimeProps: { autoActivateSpaces: true },
          // Edge signaling is created by the platform layer from the edge connection; otherwise fall
          // back to an in-memory manager (KUBE `WebsocketSignalManager` removed).
          signalManager: resolvedConfig.get('runtime.client.edgeFeatures')?.signaling
            ? undefined
            : new MemorySignalManager(memorySignalManagerContext ?? new MemorySignalManagerContext()),
          transportFactory,
        }).pipe(Layer.provideMerge(sqlite())),
      );
      runtime = stackRuntime;
      const stackContext = yield* Effect.promise(() => stackRuntime.context());
      stack = stackContext;
      log('worker-runtime: stack built, opening');
      // `StackOpened` resolves once every handler the cascade triggered has run.
      yield* Effect.gen(function* () {
        yield* Event.emit(HostEvents.Opening, undefined);
        yield* Event.emit(HostEvents.StackOpened, undefined);
      }).pipe(Effect.provide(stackContext));
      // TODO(dmaretskyi): is this diagnosticsBroadcast dead in all variations? if so, remove the diagnosticsBroadcast and createCollectDiagnosticsBroadcastHandler definitions and cleanup
      diagnosticsBroadcast = createCollectDiagnosticsBroadcastHandler(systemService);
      diagnosticsBroadcast.start();
      systemService.setStatus(SystemStatus.ACTIVE);
      log('worker-runtime: stack opened, signalling ready');
      ready.wake(undefined);
      log('started');

      // Bridge the identity/devices Handlers to the effect-rpc client surface in-process.
      const scope = yield* Scope.make();
      serviceScope = scope;
      const [identityService, devicesService] = yield* Effect.all([
        makeInProcessClient(IdentityService.Rpcs, Context_.get(stackContext, IdentityService.Tag)),
        makeInProcessClient(DevicesService.Rpcs, Context_.get(stackContext, DevicesService.Tag)),
      ]).pipe(Effect.provideService(Scope.Scope, scope));
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
      networkingFiber = yield* Effect.forkDetach(
        Effect.gen(function* () {
          yield* Effect.sleep(EDGE_NETWORKING_START_DELAY);
          log('worker-runtime: starting networking');
          yield* enableNetworking;
        }).pipe(Effect.provide(stackContext)),
      );
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
    shellPort,
    onClose,
  }: CreateSessionProps): Effect.Effect<WorkerSession> =>
    Effect.gen(function* () {
      // 
      const session = new WorkerSession({
        services,
        appProtocol,
        systemProtocol,
        shellPort,
        readySignal: ready,
      });

      // When tab is closed or client is destroyed.
      session.onClose.set(async () => {
        await EffectEx.runPromise(
          Effect.gen(function* () {
            sessions.delete(session);
            if (sessions.size === 0) {
              // Terminate the worker when all sessions are closed.
              yield* stop();
            } else if (automaticallyConnectWebrtc) {
              yield* reconnectWebrtc;
            }
          }),
        );
        await onClose?.();
      });

      yield* session.open();
      // A worker can only service one origin currently.
      invariant(
        !signalMetadataTags.origin || signalMetadataTags.origin === session.origin,
        `worker origin changed from ${signalMetadataTags.origin} to ${session.origin}?`,
      );
      signalMetadataTags.origin = session.origin;
      sessions.add(session);

      if (automaticallyConnectWebrtc) {
        yield* reconnectWebrtc;
      }

      return session;
    });

  return {
    stack: () => {
      invariant(stack, 'worker runtime not started');
      return stack;
    },
    start,
    stop,
    createSession,
    connectWebrtcBridge: (session) => Effect.sync(() => connectBridge(session)),
  };
};

/**
 * Layer providing the {@link WorkerRuntime} service. The service is constructed synchronously;
 * callers drive `start` / `stop` explicitly (see {@link WorkerRuntimeService}).
 */
export const layerWorkerRuntime = (options: WorkerRuntimeOptions): Layer.Layer<WorkerRuntime> =>
  Layer.sync(WorkerRuntime, () => makeWorkerRuntime(options));

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
