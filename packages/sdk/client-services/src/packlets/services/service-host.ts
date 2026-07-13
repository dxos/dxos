//
// Copyright 2021 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Runtime from 'effect/Runtime';
import * as Scope from 'effect/Scope';

import { Event, synchronized } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesHandlers,
  makeInProcessClientServicesRpc,
  makeServicesFromRpc,
} from '@dxos/client-protocol';
import { type Config, resolveTelemetryTag } from '@dxos/config';
import { Context } from '@dxos/context';
import { EdgeClient, type EdgeConnection, EdgeHttpClient, createStubEdgeIdentity } from '@dxos/edge-client';
import { EffectEx, RuntimeProvider } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { EdgeSignalManager, type SignalManager, SignalManagerService, WebsocketSignalManager } from '@dxos/messaging';
import {
  SwarmNetworkManager,
  SwarmNetworkManagerService,
  type TransportFactory,
  createIceProvider,
  createRtcTransportFactory,
} from '@dxos/network-manager';
import { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import type * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';
import { trace as Trace } from '@dxos/tracing';
import { WebsocketRpcClient } from '@dxos/websocket-rpc';

import { DevtoolsHostEvents, DevtoolsServiceImpl } from '../devtools';
import {
  type CollectDiagnosticsBroadcastHandler,
  createCollectDiagnosticsBroadcastHandler,
  createDiagnostics,
} from '../diagnostics';
import { Lock, type ResourceLock } from '../locks';
import { LoggingServiceImpl } from '../logging';
import { SystemServiceImpl } from '../system';
import {
  type ClientServicesRpcContext,
  ClientServicesRpcLayer,
  ContactsServiceRpc,
  DataServiceRpc,
  DevicesServiceRpc,
  EdgeAgentServiceRpc,
  FeedServiceRpc,
  IdentityServiceRpc,
  InvitationsServiceRpc,
  NetworkServiceRpc,
  QueryServiceRpc,
  SpacesServiceRpc,
} from './client-services-layer';
import {
  ServiceContext,
  ServiceContextLayer,
  type ServiceContextRuntimeProps,
  ServiceContextService,
} from './service-context';
import { ServiceRegistry } from './service-registry';

export type ClientServicesHostProps = {
  /**
   * Can be omitted if `initialize` is later called.
   */
  config?: Config;
  transportFactory?: TransportFactory;
  signalManager?: SignalManager;
  connectionLog?: boolean;
  lockKey?: string;
  callbacks?: ClientServicesHostCallbacks;
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlExport.SqlExport | SqlTransaction.SqlTransaction>;
  runtimeProps?: ServiceContextRuntimeProps;
};

export type ClientServicesHostCallbacks = {
  onReset?: () => Promise<void>;
};

export type InitializeOptions = {
  config?: Config;
  transportFactory?: TransportFactory;
  signalManager?: SignalManager;
  connectionLog?: boolean;
};

/**
 * Remote service implementation.
 */
export class ClientServicesHost {
  private readonly _resourceLock?: ResourceLock;
  private readonly _serviceRegistry: ServiceRegistry<ClientServicesHandlers>;
  private readonly _systemService: SystemServiceImpl;
  private readonly _loggingService: LoggingServiceImpl;
  private readonly _statusUpdate = new Event<void>();

  private _config?: Config;
  private _signalManager?: SignalManager;
  private _networkManager?: SwarmNetworkManager;
  private _callbacks?: ClientServicesHostCallbacks;
  private _devtoolsProxy?: WebsocketRpcClient<{}, ClientServices>;
  private _edgeConnection?: EdgeConnection = undefined;
  private _edgeHttpClient?: EdgeHttpClient = undefined;

  private _serviceContext!: ServiceContext;
  #stackRuntime?: ManagedRuntime.ManagedRuntime<ServiceContextService | ClientServicesRpcContext, never>;
  private readonly _runtime: RuntimeProvider.RuntimeProvider<
    SqlClient.SqlClient | SqlExport.SqlExport | SqlTransaction.SqlTransaction
  >;
  private readonly _runtimeProps: ServiceContextRuntimeProps;
  private diagnosticsBroadcastHandler: CollectDiagnosticsBroadcastHandler;

  private _opening = false;

  private _open = false;

  private _resetting = false;

  constructor({
    config,
    transportFactory,
    signalManager,
    // TODO(wittjosiah): Turn this on by default.
    lockKey,
    callbacks,
    runtime,
    runtimeProps,
  }: ClientServicesHostProps) {
    this._callbacks = callbacks;
    this._runtime = runtime;
    this._runtimeProps = runtimeProps ?? {};

    if (config) {
      this.initialize({ config, transportFactory, signalManager });
    }

    if (lockKey) {
      this._resourceLock = new Lock({
        lockKey,
        onAcquire: () => {
          if (!this._opening) {
            void this.open(new Context());
          }
        },
        onRelease: () => this.close(Context.default()),
      });
    }

    // TODO(wittjosiah): If config is not defined here, system service will always have undefined config.
    this._systemService = new SystemServiceImpl({
      config: () => this._config,
      statusUpdate: this._statusUpdate,
      getCurrentStatus: () => (this.isOpen && !this._resetting ? SystemStatus.ACTIVE : SystemStatus.INACTIVE),
      getDiagnostics: async () => {
        // Bridge the host Handlers to the proto services surface that diagnostics collection consumes.
        const scope = Effect.runSync(Scope.make());
        try {
          const rpc = await EffectEx.runPromise(
            makeInProcessClientServicesRpc(() => this._serviceRegistry.services).pipe(
              Effect.provideService(Scope.Scope, scope),
            ),
          );
          const services = makeServicesFromRpc(rpc, Runtime.defaultRuntime);
          return await createDiagnostics(services, this._serviceContext, this._config!);
        } finally {
          await EffectEx.runPromise(Scope.close(scope, Exit.void));
        }
      },
      onUpdateStatus: async (status: SystemStatus) => {
        if (!this.isOpen && status === SystemStatus.ACTIVE) {
          await this._resourceLock?.acquire();
        } else if (this.isOpen && status === SystemStatus.INACTIVE) {
          await this._resourceLock?.release();
        }
      },
      onReset: async () => {
        await this.reset();
      },
    });

    this.diagnosticsBroadcastHandler = createCollectDiagnosticsBroadcastHandler(this._systemService);
    this._loggingService = new LoggingServiceImpl();

    this._serviceRegistry = new ServiceRegistry<ClientServicesHandlers>({
      SystemService: this._systemService,
    });
  }

  get isOpen() {
    return this._open;
  }

  get config() {
    return this._config;
  }

  get context() {
    return this._serviceContext;
  }

  get serviceRegistry() {
    return this._serviceRegistry;
  }

  get services() {
    return this._serviceRegistry.services;
  }

  /**
   * Debugging util.
   */
  async exportSqliteDatabase(): Promise<Uint8Array> {
    return await RuntimeProvider.runPromise(this._runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlExport.SqlExport;
        return yield* sql.export;
      }),
    );
  }

  /**
   * Debugging util.
   */
  async runSqliteQuery(query: string, params?: unknown[]): Promise<readonly Record<string, unknown>[]> {
    return await RuntimeProvider.runPromise(this._runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql`${sql.unsafe(query, params)}`;
      }),
    );
  }

  /**
   * Initialize the service host with the config.
   * Config can also be provided in the constructor.
   * Can only be called once.
   */
  initialize({ config, ...options }: InitializeOptions): void {
    invariant(!this._open, 'service host is open');
    log('initializing...');

    if (config) {
      if (this._runtimeProps.disableP2pReplication === undefined) {
        this._runtimeProps.disableP2pReplication = config?.get('runtime.client.disableP2pReplication', false);
      }
      if (this._runtimeProps.enableVectorIndexing === undefined) {
        this._runtimeProps.enableVectorIndexing = config?.get('runtime.client.enableVectorIndexing', false);
      }

      invariant(!this._config, 'config already set');
      this._config = config;
    }

    // TODO(wittjosiah): This is quite noisy during tests. Make configurable? Remove?
    if (!options.signalManager) {
      // log.warn('running signaling without telemetry metadata.');
    }

    const endpoint = config?.get('runtime.services.edge.url');
    if (endpoint) {
      const clientTag = resolveTelemetryTag(config);
      this._edgeConnection = new EdgeClient(createStubEdgeIdentity(), { socketEndpoint: endpoint, clientTag });
      this._edgeHttpClient = new EdgeHttpClient(endpoint, { clientTag });
    }

    const {
      connectionLog = true,
      transportFactory = createRtcTransportFactory(
        { iceServers: this._config?.get('runtime.services.ice') },
        this._config?.get('runtime.services.iceProviders') &&
          createIceProvider(this._config!.get('runtime.services.iceProviders')!),
      ),
      signalManager = this._edgeConnection && this._config?.get('runtime.client.edgeFeatures')?.signaling
        ? new EdgeSignalManager({ edgeConnection: this._edgeConnection })
        : new WebsocketSignalManager(this._config?.get('runtime.services.signaling') ?? []),
    } = options;
    this._signalManager = signalManager;

    invariant(!this._networkManager, 'network manager already set');
    this._networkManager = new SwarmNetworkManager({
      enableDevtoolsLogging: connectionLog,
      transportFactory,
      signalManager,
      peerInfo: this._edgeConnection
        ? {
            identityDid: this._edgeConnection.identityDid,
            peerKey: this._edgeConnection.peerKey,
          }
        : undefined,
    });

    log('initialized');
  }

  @synchronized
  @Trace.span()
  async open(ctx: Context): Promise<void> {
    if (this._open) {
      return;
    }

    log('opening service host');

    invariant(this._config, 'config not set');
    invariant(this._signalManager, 'signal manager not set');
    invariant(this._networkManager, 'network manager not set');
    const config = this._config;
    const signalManager = this._signalManager;
    const networkManager = this._networkManager;

    this._opening = true;
    log('opening...', { lockKey: this._resourceLock?.lockKey });

    await this._resourceLock?.acquire();

    await this._loggingService.open();

    // Build a single runtime from the ServiceContext layer stack plus the client RPC service
    // handlers layered on top, then resolve the orchestrator and every handler from it.
    const stackLayer = ClientServicesRpcLayer.pipe(
      Layer.provideMerge(
        ServiceContextLayer({
          ...this._runtimeProps,
          edgeFeatures: config.get('runtime.client.edgeFeatures'),
          edgeConnection: this._edgeConnection,
          edgeHttpClient: this._edgeHttpClient,
        }),
      ),
      Layer.provideMerge(Layer.succeed(SwarmNetworkManagerService, networkManager)),
      Layer.provideMerge(Layer.succeed(SignalManagerService, signalManager)),
      Layer.provideMerge(RuntimeProvider.toLayer(this._runtime)),
      Layer.orDie,
    );
    this.#stackRuntime = ManagedRuntime.make(stackLayer);
    const resolved = await this.#stackRuntime.runPromise(
      Effect.all({
        serviceContext: ServiceContextService,
        identityService: IdentityServiceRpc,
        contactsService: ContactsServiceRpc,
        invitationsService: InvitationsServiceRpc,
        devicesService: DevicesServiceRpc,
        spacesService: SpacesServiceRpc,
        networkService: NetworkServiceRpc,
        edgeAgentService: EdgeAgentServiceRpc,
        dataService: DataServiceRpc,
        queryService: QueryServiceRpc,
        feedService: FeedServiceRpc,
      }),
    );
    this._serviceContext = resolved.serviceContext;
    const identityService = resolved.identityService;

    this._serviceRegistry.setServices({
      SystemService: this._systemService,
      IdentityService: identityService,
      ContactsService: resolved.contactsService,

      InvitationsService: resolved.invitationsService,

      DevicesService: resolved.devicesService,

      SpacesService: resolved.spacesService,

      DataService: resolved.dataService,
      QueryService: resolved.queryService,
      FeedService: resolved.feedService,

      NetworkService: resolved.networkService,

      LoggingService: this._loggingService,

      // TODO(burdon): Move to new protobuf definitions.
      DevtoolsHost: new DevtoolsServiceImpl({
        events: new DevtoolsHostEvents(),
        config: this._config,
        context: this._serviceContext,
        exportSqliteDatabase: () => this.exportSqliteDatabase(),
        runSqliteQuery: (query, params) => this.runSqliteQuery(query, params),
      }),

      EdgeAgentService: resolved.edgeAgentService,
    });

    log('service-host: opening service context...');
    await this._serviceContext.open(ctx);
    log('service-host: service context opened');

    log('service-host: opening identity service...');
    await identityService.open();
    log('service-host: identity service opened');

    const devtoolsProxy = this._config?.get('runtime.client.devtoolsProxy');
    if (devtoolsProxy) {
      // TODO(dxos): The devtools websocket proxy serves the protobuf service bundle, which is
      // incompatible with the effect-rpc Handlers the host now provides. Re-enable once this legacy
      // transport is migrated to effect-rpc (or bridged via makeInProcessClient + a proto adapter).
      log.warn('devtoolsProxy is not supported with effect-rpc services; skipping', { devtoolsProxy });
    }
    this.diagnosticsBroadcastHandler.start();

    this._opening = false;
    this._open = true;
    this._statusUpdate.emit();
    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('opened', { deviceKey });
  }

  @synchronized
  @Trace.span()
  async close(ctx: Context): Promise<void> {
    if (!this._open) {
      return;
    }

    const deviceKey = this._serviceContext.identityManager.identity?.deviceKey;
    log('closing...', { deviceKey });
    this.diagnosticsBroadcastHandler.stop();
    await this._devtoolsProxy?.close();
    this._serviceRegistry.setServices({ SystemService: this._systemService });
    await this._loggingService.close();
    await this._serviceContext.close();
    await this.#stackRuntime?.dispose();
    this.#stackRuntime = undefined;
    this._open = false;
    this._statusUpdate.emit();
    log('closed', { deviceKey });
  }

  async reset(): Promise<void> {
    log.info('resetting...');
    // Emit this status update immediately so app returns to fallback.
    // This state is never cleared because the app reloads.
    this._resetting = true;
    this._statusUpdate.emit();
    await this._serviceContext?.close();
    // Wipe all SQLite tables so next open starts fresh.
    await RuntimeProvider.runPromise(this._runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        // Echo metadata + large space data.
        yield* sql`DELETE FROM space_metadata`;
        yield* sql`DELETE FROM space_large`;
        // Blob store.
        yield* sql`DELETE FROM blobs_meta`;
        yield* sql`DELETE FROM blobs_data`;
        // Keyring.
        yield* sql`DELETE FROM keyring`;
        // Automerge chunks + heads.
        yield* sql`DELETE FROM automerge_chunks`;
        yield* sql`DELETE FROM automerge_heads`;
        // Hypercore feed files.
        yield* sql`DELETE FROM hypercore_files`;
        // Feed store (queue feeds, blocks, etc.).
        yield* sql`DELETE FROM feeds`;
        yield* sql`DELETE FROM blocks`;
        yield* sql`DELETE FROM subscriptions`;
        yield* sql`DELETE FROM cursor_tokens`;
        yield* sql`DELETE FROM sync_state`;
        // Index tables.
        yield* sql`DELETE FROM indexCursor`;
        yield* sql`DELETE FROM objectMeta`;
        yield* sql`DELETE FROM reverseRef`;
        yield* sql`DELETE FROM ftsIndex`;
      }),
    );
    log.info('reset');
    await this._callbacks?.onReset?.();
  }
}
