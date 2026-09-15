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
} from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
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
 * runtime, served to the client without a wire hop.
 */
export class LocalClientServices implements ClientServicesProvider {
  readonly closed = new Event<Error | undefined>();
  private readonly _ctx = new Context();
  private readonly _params: LocalClientServicesParams;
  private readonly _createOpfsWorker?: () => Worker;
  private readonly _sqlitePath?: string;
  // TODO(dmaretskyi): Lifetime seems to be the same as a stack -> turn into layer.
  private _opfsWorker?: Worker;
  // TODO(dmaretskyi): Merge _runtime and _stackRuntime into a single layer.
  private _runtime?: ManagedRuntime.ManagedRuntime<
    SqlTransaction.SqlTransaction | SqlClient.SqlClient | SqlExport.SqlExport,
    never
  >;
  private _stackRuntime?: ManagedRuntime.ManagedRuntime<ClientServicesStackContext, never>;
  private _stack?: EffectContext.Context<ClientServicesStackContext>;
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
    this._createOpfsWorker = params.createOpfsWorker;
    this._sqlitePath = params.sqlitePath;
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
      SystemServiceImpl,
      createCollectDiagnosticsBroadcastHandler,
      createDiagnostics,
      handlersFromStack,
      openStack,
      wipeSqliteStorage,
    } = await import('@dxos/client-services');
    const { setIdentityTags } = await import('@dxos/messaging');

    // Create SQLite runtime layer. The choice is driven by `runtime.client.storage.sqlite_mode`
    // in config — the presence of `createOpfsWorker` or `sqlitePath` options does not influence
    // the decision. Missing prerequisites throw instead of silently falling back.
    //
    // TODO(mykola): Worker and runtime leak if the stack open fails below.
    const sqliteMode =
      this._params.config?.get('runtime.client.storage.sqliteMode') ??
      Runtime_Client_Storage_SqliteMode.UNSPECIFIED_SQLITE_MODE;
    log('initiatlizing sqlite', {
      sqliteMode,
      createOpfsWorker: !!this._createOpfsWorker,
      sqlitePath: this._sqlitePath,
    });
    let sqliteLayer;
    switch (sqliteMode) {
      case Runtime_Client_Storage_SqliteMode.OPFS: {
        if (!this._createOpfsWorker) {
          throw new Error(
            'LocalClientServices: runtime.client.storage.sqlite_mode=OPFS requires a createOpfsWorker option.',
          );
        }
        this._opfsWorker = this._createOpfsWorker();
        sqliteLayer = SqliteClient.layer({ worker: Effect.succeed(this._opfsWorker) });
        log('using sqlite opfs worker');
        break;
      }
      case Runtime_Client_Storage_SqliteMode.FILE: {
        if (!this._sqlitePath) {
          throw new Error(
            'LocalClientServices: runtime.client.storage.sqlite_mode=FILE requires sqlitePath (or runtime.client.storage.data_root with persistent=true).',
          );
        }
        sqliteLayer = layerFile(this._sqlitePath);
        log('using sqlite file', { sqlitePath: this._sqlitePath });
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

    const runtime = ManagedRuntime.make(
      SqlTransaction.layer.pipe(
        Layer.provideMerge(sqlExportLayer),
        Layer.provideMerge(sqliteLayer),
        Layer.provideMerge(Reactivity.layer),
        Layer.orDie,
      ),
    );
    this._runtime = runtime;

    const config = this._params.config ?? new Config();
    const stackRuntime = ManagedRuntime.make(
      ClientServicesLayer({
        config,
        runtime: runtime.contextEffect,
        runtimeProps: this._params.runtimeProps,
        signalManager: this._params.signalManager,
        transportFactory: this._params.transportFactory,
        connectionLog: this._params.connectionLog,
        autoConnect: this._params.autoConnect,
      }),
    );
    this._stackRuntime = stackRuntime;
    this._stack = await stackRuntime.context();
    await stackRuntime.runPromise(openStack(this._ctx));

    // The system service is the host-side owner of status and reset; it lives with this open.
    const systemService = new SystemServiceImpl({
      config: () => config,
      getDiagnostics: async () => createDiagnostics(this.services, this.stack, config),
      close: () => this.close(),
      wipeStorage: () => runtime.runPromise(wipeSqliteStorage),
      onReset: async () => {
        this.closed.emit(undefined);
        await this._params.callbacks?.onReset?.();
      },
    });
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

    this._diagnosticsBroadcast?.stop();
    this._diagnosticsBroadcast = undefined;
    await this._stackRuntime?.dispose();
    this._stackRuntime = undefined;
    this._stack = undefined;

    if (this._serviceScope) {
      await EffectEx.runPromise(Scope.close(this._serviceScope, Exit.void));
      this._serviceScope = undefined;
    }
    this._rpc = undefined;
    this._services = undefined;

    log('local-client-services: terminated effect runtime', { runtimePresent: !!this._runtime });
    await this._runtime?.dispose();
    this._runtime = undefined;
    // Runtime dispose posts `close` to the OPFS worker; wait for flush before terminate.
    if (this._opfsWorker) {
      await waitForOpfsWorkerClosed(this._opfsWorker);
      this._opfsWorker.terminate();
      this._opfsWorker = undefined;
    }

    this._isOpen = false;
  }
}
