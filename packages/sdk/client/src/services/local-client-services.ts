//
// Copyright 2023 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Scope from 'effect/Scope';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { Event, synchronized } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesProvider,
  type ClientServicesRpc,
  makeInProcessClientServicesRpc,
  makeServicesFromRpc,
} from '@dxos/client-protocol';
import {
  type ClientServicesLayerOptions,
  type ClientServicesStackContext,
  type CollectDiagnosticsBroadcastHandler,
  type ServiceContextRuntimeProps,
  type SystemServiceImpl,
} from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { Event as EffectEvent, EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type SignalManager } from '@dxos/messaging';
import { type SwarmNetworkManagerOptions, type TransportFactory, createIceProvider } from '@dxos/network-manager';
import { SystemStatus } from '@dxos/protocols/buf/dxos/client/services_pb';
import { Runtime_Client_Storage_SqliteMode } from '@dxos/protocols/buf/dxos/config_pb';
import { layerFile, layerMemory, sqlExportLayer } from '@dxos/sql-sqlite/platform';
import type * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';

const waitForOpfsWorkerClosed = (worker: Worker, timeoutMs = 30_000): Promise<void> =>
  new Promise((resolve) => {
    const timeout = setTimeout(() => {
      worker.removeEventListener('message', onMessage);
      resolve();
    }, timeoutMs);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.[0] === 'closed') {
        clearTimeout(timeout);
        worker.removeEventListener('message', onMessage);
        resolve();
      }
    };

    worker.addEventListener('message', onMessage);
  });

/** The OPFS worker the sqlite client runs in. */
class OpfsWorker extends EffectContext.Service<OpfsWorker, Worker>()('@dxos/client/OpfsWorker') {}

/**
 * Owns the OPFS worker for the life of the layer. Sits beneath the sqlite client, whose finalizer
 * posts `close` to the worker, so this one waits for the flush before terminating it.
 */
const opfsWorkerLayer = (createWorker: () => Worker): Layer.Layer<OpfsWorker> =>
  Layer.effect(
    OpfsWorker,
    Effect.acquireRelease(Effect.sync(createWorker), (worker) =>
      Effect.promise(async () => {
        await waitForOpfsWorkerClosed(worker);
        worker.terminate();
      }),
    ),
  );

export type LocalClientServicesParams = {
  config?: Config;
  transportFactory?: TransportFactory;
  signalManager?: SignalManager;
  connectionLog?: boolean;
  callbacks?: { onReset?: () => Promise<void> };
  /** See {@link ClientServicesLayerOptions.autoConnect}. */
  autoConnect?: boolean;
  runtimeProps?: ServiceContextRuntimeProps;
  createOpfsWorker?: () => Worker;
  /**
   * Path to SQLite database file for persistent indexing in Node/Bun.
   * If not provided, falls back to in-memory SQLite (indexes lost on restart).
   */
  sqlitePath?: string;
};

/**
 * Creates stand-alone services without rpc.
 */
// TODO(burdon): Rename createLocalServices?
export const fromHost = async (
  config = new Config(),
  params?: LocalClientServicesParams,
): Promise<ClientServicesProvider> => {
  const networking = await setupNetworking(config, {});

  const services = new LocalClientServices({ config, ...networking, ...params });
  return services;
};

/**
 * Creates signal manager and transport factory based on config.
 * These are used to create a WebRTC network manager connected to the specified signal server.
 */
const setupNetworking = async (
  config: Config,
  options: Partial<SwarmNetworkManagerOptions> = {},
): Promise<{
  signalManager?: SignalManager;
  transportFactory: TransportFactory;
}> => {
  const { MemorySignalManager, MemorySignalManagerContext } = await import('@dxos/messaging');
  const { createRtcTransportFactory, MemoryTransportFactory } = await import('@dxos/network-manager');

  const signals = config.get('runtime.services.signaling');
  const edgeFeatures = config.get('runtime.client.edgeFeatures');
  const iceProviders = config.get('runtime.services.iceProviders');
  const iceProvider = iceProviders && createIceProvider(iceProviders);
  if (signals || edgeFeatures?.signaling) {
    const {
      // EdgeSignalManager needs an EdgeConnection and is created in the services host; without edge
      // signaling fall back to an isolated in-memory manager (KUBE `WebsocketSignalManager` removed).
      signalManager = edgeFeatures?.signaling ? undefined : new MemorySignalManager(new MemorySignalManagerContext()),
      // node-datachannel supports bun and node alike, so both use the RTC transport.
      transportFactory = createRtcTransportFactory({ iceServers: config.get('runtime.services.ice') }, iceProvider),
    } = options;

    return {
      signalManager,
      transportFactory,
    };
  }

  // TODO(burdon): Should not provide a memory signal manager since no shared context.
  //  Use TestClientBuilder for shared memory tests.
  log('P2P network is not configured.');
  const signalManager = new MemorySignalManager(new MemorySignalManagerContext());
  const transportFactory = MemoryTransportFactory;
  return {
    signalManager,
    transportFactory,
  };
};

/**
 * Runs the client services in-process: the stack from {@link ClientServicesLayer} over a SQLite
 * layer chosen by config, served to the client without a wire hop.
 */
export class LocalClientServices implements ClientServicesProvider {
  readonly closed = new Event<Error | undefined>();
  private readonly _ctx = new Context();
  private readonly _params: LocalClientServicesParams;
  /** Outlives the stack: the reset chain runs on it after the stack is gone. */
  private readonly _bus = EffectEvent.makeBus();
  private _busScope?: Scope.Closeable;
  private _runtime?: ManagedRuntime.ManagedRuntime<ClientServicesStackContext, never>;
  private _stack?: EffectContext.Context<ClientServicesStackContext>;
  private _systemService?: SystemServiceImpl;
  private _diagnosticsBroadcast?: CollectDiagnosticsBroadcastHandler;
  signalMetadataTags: any = {
    runtime: 'local-client-services',
  };

  private _isOpen = false;
  private _serviceScope?: Scope.Closeable;
  private _rpc?: ClientServicesRpc;
  private _services?: Partial<ClientServices>;

  constructor(params: LocalClientServicesParams) {
    this._params = params;
    // TODO(nf): extract
    if (typeof window === 'undefined' || typeof window.location === 'undefined') {
      // TODO(nf): collect ClientServices metadata as param?
      this.signalMetadataTags.origin = 'undefined';
    } else {
      // SocketSupply native app
      if ((globalThis as any).__args) {
        this.signalMetadataTags.runtime = 'native';
        this.signalMetadataTags.origin = window.location.origin;
        // TODO(nf): access socket app metadata?
      } else {
        this.signalMetadataTags.origin = window.location.origin;
      }
    }
  }

  get rpc() {
    invariant(this._rpc, 'Client services not open');
    return this._rpc;
  }

  get services(): Partial<ClientServices> {
    invariant(this._services, 'Client services not open');
    return this._services;
  }

  /**
   * Effect context of the running stack: every component and RPC handler. Present while open.
   */
  get stack(): EffectContext.Context<ClientServicesStackContext> {
    invariant(this._stack, 'Client services not open');
    return this._stack;
  }

  @synchronized
  async open(): Promise<void> {
    if (this._isOpen) {
      return;
    }

    const {
      ClientServicesLayer,
      HostEvents,
      SystemServiceImpl,
      createCollectDiagnosticsBroadcastHandler,
      createDiagnostics,
      handlersFromStack,
      wipeSqliteStorage,
    } = await import('@dxos/client-services');
    const { setIdentityTags } = await import('@dxos/messaging');

    const config = this._params.config ?? new Config();
    const runtime = ManagedRuntime.make(
      ClientServicesLayer({
        config,
        bus: this._bus,
        runtimeProps: this._params.runtimeProps,
        signalManager: this._params.signalManager,
        transportFactory: this._params.transportFactory,
        connectionLog: this._params.connectionLog,
        autoConnect: this._params.autoConnect,
      }).pipe(Layer.provideMerge(this._sqliteLayer()), Layer.orDie),
    );
    this._runtime = runtime;
    this._stack = await runtime.context();
    // `StackOpened` resolves once every handler the cascade triggered has run.
    await runtime.runPromise(
      EffectEx.withContext(this._ctx)(
        Effect.gen(function* () {
          yield* EffectEvent.emit(HostEvents.Opening, undefined);
          yield* EffectEvent.emit(HostEvents.StackOpened, undefined);
        }),
      ),
    );

    const systemService = new SystemServiceImpl({
      config: () => config,
      getDiagnostics: async () => createDiagnostics(this.services, this.stack, config),
      bus: this._bus,
    });
    this._systemService = systemService;
    // Reset closes only the stack: the in-process endpoint stays up so the reset RPC can answer.
    this._busScope = Effect.runSync(Scope.make());
    Effect.runSync(
      Effect.gen({ self: this }, function* () {
        yield* EffectEvent.on(HostEvents.Closing, () => Effect.promise(() => this._closeStack()));
        yield* EffectEvent.on(HostEvents.WipingStorage, () =>
          wipeSqliteStorage.pipe(Effect.provide(this._sqliteLayer()), Effect.orDie),
        );
        yield* EffectEvent.on(HostEvents.Reset, () =>
          Effect.promise(async () => {
            this.closed.emit(undefined);
            await this._params.callbacks?.onReset?.();
          }),
        );
      }).pipe(Effect.provideService(EffectEvent.Bus, this._bus), Scope.provide(this._busScope)),
    );
    const handlers = { SystemService: systemService, ...handlersFromStack(this._stack) };
    this._diagnosticsBroadcast = createCollectDiagnosticsBroadcastHandler(systemService);
    this._diagnosticsBroadcast.start();
    systemService.setStatus(SystemStatus.ACTIVE);
    this._isOpen = true;

    // Bridge the in-process Handlers to the effect-rpc client surface (no wire hop), then derive
    // the deprecated Promise/Stream shaped services from it for consumers not yet on the effect surface.
    this._serviceScope = Effect.runSync(Scope.make());
    this._rpc = await EffectEx.runPromise(
      makeInProcessClientServicesRpc(() => handlers).pipe(Scope.provide(this._serviceScope)),
    );
    this._services = makeServicesFromRpc(this._rpc, EffectContext.empty());

    setIdentityTags({
      identityService: this._rpc,
      devicesService: this._rpc,
      setTag: (k: string, v: string) => {
        this.signalMetadataTags[k] = v;
      },
    });
  }

  @synchronized
  async close(): Promise<void> {
    if (!this._isOpen) {
      return;
    }

    await this._closeStack();

    if (this._busScope) {
      await EffectEx.runPromise(Scope.close(this._busScope, Exit.void));
      this._busScope = undefined;
    }
    if (this._serviceScope) {
      await EffectEx.runPromise(Scope.close(this._serviceScope, Exit.void));
      this._serviceScope = undefined;
    }
    this._rpc = undefined;
    this._services = undefined;
    this._isOpen = false;
  }

  /**
   * Disposes the stack runtime, and with it the SQLite layer and its worker. Idempotent.
   */
  private async _closeStack(): Promise<void> {
    this._diagnosticsBroadcast?.stop();
    this._diagnosticsBroadcast = undefined;
    const runtime = this._runtime;
    this._runtime = undefined;
    this._stack = undefined;
    await runtime?.dispose();
    this._systemService?.setStatus(SystemStatus.INACTIVE);
  }

  /**
   * The SQLite layer for `runtime.client.storage.sqlite_mode`; a reset wipes storage over a fresh
   * one, since the stack's is gone by then. The presence of `createOpfsWorker` or
   * `sqlitePath` does not influence the choice; a missing prerequisite throws instead of falling back.
   */
  // TODO(dmaretskyi): Export the sqlite part of this into module-level layer def
  private _sqliteLayer(): Layer.Layer<
    SqlTransaction.SqlTransaction | SqlClient.SqlClient | SqlExport.SqlExport,
    unknown
  > {
    const sqliteMode =
      this._params.config?.get('runtime.client.storage.sqliteMode') ??
      Runtime_Client_Storage_SqliteMode.UNSPECIFIED_SQLITE_MODE;
    log('initiatlizing sqlite', {
      sqliteMode,
      createOpfsWorker: !!this._params.createOpfsWorker,
      sqlitePath: this._params.sqlitePath,
    });
    let sqliteLayer: Layer.Layer<SqlClient.SqlClient, unknown>;
    switch (sqliteMode) {
      case Runtime_Client_Storage_SqliteMode.OPFS: {
        const createWorker = this._params.createOpfsWorker;
        if (!createWorker) {
          throw new Error(
            'LocalClientServices: runtime.client.storage.sqlite_mode=OPFS requires a createOpfsWorker option.',
          );
        }
        sqliteLayer = Layer.unwrap(
          Effect.map(OpfsWorker, (worker) => SqliteClient.layer({ worker: Effect.succeed(worker) })),
        ).pipe(Layer.provide(opfsWorkerLayer(createWorker)));
        log('using sqlite opfs worker');
        break;
      }
      case Runtime_Client_Storage_SqliteMode.FILE: {
        if (!this._params.sqlitePath) {
          throw new Error(
            'LocalClientServices: runtime.client.storage.sqlite_mode=FILE requires sqlitePath (or runtime.client.storage.data_root with persistent=true).',
          );
        }
        sqliteLayer = layerFile(this._params.sqlitePath);
        log('using sqlite file', { sqlitePath: this._params.sqlitePath });
        break;
      }
      case Runtime_Client_Storage_SqliteMode.MEMORY:
      case Runtime_Client_Storage_SqliteMode.UNSPECIFIED_SQLITE_MODE:
      default: {
        if (sqliteMode === Runtime_Client_Storage_SqliteMode.UNSPECIFIED_SQLITE_MODE) {
          log.warn('runtime.client.storage.sqlite_mode not set, using in-memory SQLite');
        }
        sqliteLayer = layerMemory;
        break;
      }
    }

    return SqlTransaction.layer.pipe(
      Layer.provideMerge(sqlExportLayer),
      Layer.provideMerge(sqliteLayer),
      Layer.provideMerge(Reactivity.layer),
    );
  }
}
