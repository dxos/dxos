//
// Copyright 2022 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import type * as RpcClient from '@effect/rpc/RpcClient';
import type * as RpcServer from '@effect/rpc/RpcServer';
import type * as SqlClient from '@effect/sql/SqlClient';
import * as Context_ from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Scope from 'effect/Scope';

import { Trigger } from '@dxos/async';
import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import {
  MemorySignalManager,
  MemorySignalManagerContext,
  WebsocketSignalManager,
  setIdentityTags,
} from '@dxos/messaging';
import { RtcTransportProxyFactory } from '@dxos/network-manager';
import { makeInProcessClient } from '@dxos/protocols';
import { DevicesService, IdentityService } from '@dxos/protocols/rpc';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';
import { type MaybePromise } from '@dxos/util';

import { ClientServicesHost } from '../services';
import { WorkerSession } from './worker-session';

// Session transports are effect-rpc protocol layers handed over by the worker framework: appProtocol
// serves the client services (+ WorkerService); systemProtocol carries the reverse-direction
// BridgeService (worker→tab).
export type CreateSessionProps = {
  appProtocol: RpcServer.Protocol['Type'];
  systemProtocol: RpcClient.Protocol['Type'];
  shellPort?: MessagePort;
  onClose?: () => Promise<void>;
};

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
};

/**
 * Effect service surface for the dedicated-worker runtime.
 *
 * Manages connections from proxies (in tabs): tabs make requests to the `ClientServicesHost`, and
 * provide a WebRTC gateway. Lifecycle (`start` / `stop`) is caller-driven — the worker framework
 * builds the runtime after receiving init config, then drives sessions for their lifetime — so these
 * are explicit programs rather than Layer finalizers.
 */
export interface WorkerRuntimeService {
  /** The client services host served to connected tabs. */
  readonly host: ClientServicesHost;
  /** Resolve config, open the services host, and signal readiness. Never fails: startup errors are surfaced to session callers via the readiness gate. */
  readonly start: () => Effect.Effect<void>;
  /** Tear down sessions' host, dispose the runtime, release the storage lock, and run `onStop`. Idempotent. */
  readonly stop: () => Effect.Effect<void>;
  /** Open a new tab session over the supplied effect-rpc protocols and register it for WebRTC bridging. */
  readonly createSession: (props: CreateSessionProps) => Effect.Effect<WorkerSession>;
  /** Route the WebRTC bridge through the given session (or disconnect when `undefined`). */
  readonly connectWebrtcBridge: (session: WorkerSession | undefined) => Effect.Effect<void>;
}

/**
 * Context tag for the dedicated-worker runtime service. Provided by {@link layerWorkerRuntime}.
 */
export class WorkerRuntime extends Context_.Tag('@dxos/client-services/WorkerRuntime')<
  WorkerRuntime,
  WorkerRuntimeService
>() {}

/**
 * Constructs the {@link WorkerRuntimeService}. The SQLite {@link ManagedRuntime} and
 * {@link ClientServicesHost} are built eagerly; the async open sequence runs in {@link start}.
 */
export const makeWorkerRuntime = ({
  configProvider,
  acquireLock,
  releaseLock,
  onStop,
  automaticallyConnectWebrtc = true,
  sqliteLayer,
}: WorkerRuntimeOptions): WorkerRuntimeService => {
  const transportFactory = new RtcTransportProxyFactory();
  const ready = new Trigger<Error | undefined>();
  const sessions = new Set<WorkerSession>();
  const signalMetadataTags: any = { runtime: 'worker-runtime' };

  let signalTelemetryEnabled = false;
  let stopped = false;
  let sessionForNetworking: WorkerSession | undefined;
  let config: Config;
  let serviceScope: Scope.CloseableScope | undefined;

  if (sqliteLayer) {
    log.warn('Using testing SQLite layer');
  }

  const runtime = ManagedRuntime.make(
    SqlTransaction.layer
      .pipe(Layer.provideMerge(sqliteLayer ?? LocalSqliteOpfsLayer), Layer.provideMerge(Reactivity.layer))
      .pipe(Layer.orDie),
  );

  const stop = (): Effect.Effect<void> =>
    Effect.promise(async () => {
      if (stopped) {
        return;
      }
      stopped = true;
      // Release the lock to notify remote clients that the worker is terminating.
      releaseLock();
      await clientServices.close(Context.default());
      if (serviceScope) {
        await EffectEx.runPromise(Scope.close(serviceScope, Exit.void));
        serviceScope = undefined;
      }
      await runtime.dispose();
      await onStop?.();
    });

  const clientServices = new ClientServicesHost({
    callbacks: {
      onReset: async () => {
        await EffectEx.runPromise(stop());
      },
    },
    runtime: runtime.runtimeEffect,
    runtimeProps: {
      // Auto-activate spaces that were previously active after leader changeover.
      autoActivateSpaces: true,
    },
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
    Effect.promise(async () => {
      log('starting...');
      try {
        log('worker-runtime: acquiring storage lock');
        await acquireLock();
        log('worker-runtime: storage lock acquired, resolving config');
        config = await configProvider();
        log('worker-runtime: config resolved');
        signalTelemetryEnabled = config.get('runtime.client.signalTelemetryEnabled') ?? false;
        const observabilityGroup = config.get('runtime.client.observabilityGroup');
        if (observabilityGroup) {
          signalMetadataTags.group = observabilityGroup;
        }
        const signals = config.get('runtime.services.signaling');
        log('worker-runtime: initializing client services host');
        clientServices.initialize({
          config,
          signalManager: config.get('runtime.client.edgeFeatures')?.signaling
            ? undefined
            : signals
              ? new WebsocketSignalManager(signals, () => (signalTelemetryEnabled ? signalMetadataTags : {}))
              : new MemorySignalManager(new MemorySignalManagerContext()), // TODO(dmaretskyi): Inject this context.
          transportFactory,
        });
        log('worker-runtime: client services host initialized, opening');

        await clientServices.open(new Context());
        log('worker-runtime: client services host opened, signalling ready');
        ready.wake(undefined);
        log('started');
        // Bridge the host identity/devices Handlers to the effect-rpc client surface in-process.
        serviceScope = Effect.runSync(Scope.make());
        const [identityService, devicesService] = await EffectEx.runPromise(
          Effect.all([
            makeInProcessClient(IdentityService.Rpcs, clientServices.services.IdentityService!),
            makeInProcessClient(DevicesService.Rpcs, clientServices.services.DevicesService!),
          ]).pipe(Effect.provideService(Scope.Scope, serviceScope)),
        );
        setIdentityTags({
          identityService,
          devicesService,
          setTag: (key: string, value: string) => {
            signalMetadataTags[key] = value;
          },
        });
      } catch (err: any) {
        ready.wake(err);
        log.error('starting', err);
      }
    });

  const createSession = ({ appProtocol, systemProtocol, shellPort, onClose }: CreateSessionProps): Effect.Effect<WorkerSession> =>
    Effect.gen(function* () {
      const session = new WorkerSession({
        serviceHost: clientServices,
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
    host: clientServices,
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
