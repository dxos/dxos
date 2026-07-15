//
// Copyright 2021 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as EffectContext from 'effect/Context';
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
  readonly #resourceLock?: ResourceLock;
  // Effect-rpc handlers served over each connection, resolved from the Layer stack on open and reset
  // to the host-local set on close. Held directly (no separate registry indirection).
  #handlers: Partial<ClientServicesHandlers>;
  readonly #systemService: SystemServiceImpl;
  readonly #loggingService: LoggingServiceImpl;
  readonly #statusUpdate = new Event<void>();

  #config?: Config;
  #signalManager?: SignalManager;
  #networkManager?: SwarmNetworkManager;
  #callbacks?: ClientServicesHostCallbacks;
  #devtoolsProxy?: WebsocketRpcClient<{}, ClientServices>;
  #edgeConnection?: EdgeConnection = undefined;
  #edgeHttpClient?: EdgeHttpClient = undefined;

  #serviceContext!: ServiceContext;
  #stackRuntime?: ManagedRuntime.ManagedRuntime<ServiceContextService | ClientServicesRpcContext, never>;
  readonly #runtime: RuntimeProvider.RuntimeProvider<
    SqlClient.SqlClient | SqlExport.SqlExport | SqlTransaction.SqlTransaction
  >;
  readonly #runtimeProps: ServiceContextRuntimeProps;
  #diagnosticsBroadcastHandler: CollectDiagnosticsBroadcastHandler;

  #opening = false;

  #open = false;

  #resetting = false;

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
    this.#callbacks = callbacks;
    this.#runtime = runtime;
    this.#runtimeProps = runtimeProps ?? {};

    if (config) {
      this.initialize({ config, transportFactory, signalManager });
    }

    if (lockKey) {
      this.#resourceLock = new Lock({
        lockKey,
        onAcquire: () => {
          if (!this.#opening) {
            void this.open(new Context());
          }
        },
        onRelease: () => this.close(Context.default()),
      });
    }

    // TODO(wittjosiah): If config is not defined here, system service will always have undefined config.
    this.#systemService = new SystemServiceImpl({
      config: () => this.#config,
      statusUpdate: this.#statusUpdate,
      getCurrentStatus: () => (this.isOpen && !this.#resetting ? SystemStatus.ACTIVE : SystemStatus.INACTIVE),
      getDiagnostics: async () => {
        // Bridge the host Handlers to the proto services surface that diagnostics collection consumes.
        const scope = Effect.runSync(Scope.make());
        try {
          const rpc = await EffectEx.runPromise(
            makeInProcessClientServicesRpc(() => this.#handlers).pipe(Effect.provideService(Scope.Scope, scope)),
          );
          const services = makeServicesFromRpc(rpc, Runtime.defaultRuntime);
          return await createDiagnostics(services, this.#serviceContext, this.#config!);
        } finally {
          await EffectEx.runPromise(Scope.close(scope, Exit.void));
        }
      },
      onUpdateStatus: async (status: SystemStatus) => {
        if (!this.isOpen && status === SystemStatus.ACTIVE) {
          await this.#resourceLock?.acquire();
        } else if (this.isOpen && status === SystemStatus.INACTIVE) {
          await this.#resourceLock?.release();
        }
      },
      onReset: async () => {
        await this.reset();
      },
    });

    this.#diagnosticsBroadcastHandler = createCollectDiagnosticsBroadcastHandler(this.#systemService);
    this.#loggingService = new LoggingServiceImpl();

    this.#handlers = {
      SystemService: this.#systemService,
    };
  }

  get isOpen() {
    return this.#open;
  }

  get config() {
    return this.#config;
  }

  get context() {
    return this.#serviceContext;
  }

  get services() {
    return this.#handlers;
  }

  /**
   * Debugging util.
   */
  async exportSqliteDatabase(): Promise<Uint8Array> {
    return await RuntimeProvider.runPromise(this.#runtime)(
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
    return await RuntimeProvider.runPromise(this.#runtime)(
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
    invariant(!this.#open, 'service host is open');
    log('initializing...');

    if (config) {
      if (this.#runtimeProps.disableP2pReplication === undefined) {
        this.#runtimeProps.disableP2pReplication = config?.get('runtime.client.disableP2pReplication', false);
      }
      if (this.#runtimeProps.enableVectorIndexing === undefined) {
        this.#runtimeProps.enableVectorIndexing = config?.get('runtime.client.enableVectorIndexing', false);
      }

      invariant(!this.#config, 'config already set');
      this.#config = config;
    }

    // TODO(wittjosiah): This is quite noisy during tests. Make configurable? Remove?
    if (!options.signalManager) {
      // log.warn('running signaling without telemetry metadata.');
    }

    const endpoint = config?.get('runtime.services.edge.url');
    if (endpoint) {
      const clientTag = resolveTelemetryTag(config);
      this.#edgeConnection = new EdgeClient(createStubEdgeIdentity(), { socketEndpoint: endpoint, clientTag });
      this.#edgeHttpClient = new EdgeHttpClient(endpoint, { clientTag });
    }

    const {
      connectionLog = true,
      transportFactory = createRtcTransportFactory(
        { iceServers: this.#config?.get('runtime.services.ice') },
        this.#config?.get('runtime.services.iceProviders') &&
          createIceProvider(this.#config!.get('runtime.services.iceProviders')!),
      ),
      signalManager = this.#edgeConnection && this.#config?.get('runtime.client.edgeFeatures')?.signaling
        ? new EdgeSignalManager({ edgeConnection: this.#edgeConnection })
        : new WebsocketSignalManager(this.#config?.get('runtime.services.signaling') ?? []),
    } = options;
    this.#signalManager = signalManager;

    invariant(!this.#networkManager, 'network manager already set');
    this.#networkManager = new SwarmNetworkManager({
      enableDevtoolsLogging: connectionLog,
      transportFactory,
      signalManager,
      peerInfo: this.#edgeConnection
        ? {
            identityDid: this.#edgeConnection.identityDid,
            peerKey: this.#edgeConnection.peerKey,
          }
        : undefined,
    });

    log('initialized');
  }

  @synchronized
  @Trace.span()
  async open(ctx: Context): Promise<void> {
    if (this.#open) {
      return;
    }

    log('opening service host');

    invariant(this.#config, 'config not set');
    invariant(this.#signalManager, 'signal manager not set');
    invariant(this.#networkManager, 'network manager not set');
    const config = this.#config;
    const signalManager = this.#signalManager;
    const networkManager = this.#networkManager;

    this.#opening = true;
    log('opening...', { lockKey: this.#resourceLock?.lockKey });

    await this.#resourceLock?.acquire();

    await this.#loggingService.open();

    // Build a single runtime from the ServiceContext layer stack plus the client RPC service
    // handlers layered on top, then resolve the orchestrator and every handler from it.
    const stackLayer = ClientServicesRpcLayer.pipe(
      Layer.provideMerge(
        ServiceContextLayer({
          ...this.#runtimeProps,
          edgeFeatures: config.get('runtime.client.edgeFeatures'),
          edgeConnection: this.#edgeConnection,
          edgeHttpClient: this.#edgeHttpClient,
        }),
      ),
      Layer.provideMerge(Layer.succeed(SwarmNetworkManagerService, networkManager)),
      Layer.provideMerge(Layer.succeed(SignalManagerService, signalManager)),
      Layer.provideMerge(RuntimeProvider.toLayer(this.#runtime)),
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
    this.#serviceContext = resolved.serviceContext;
    const identityService = resolved.identityService;

    this.#handlers = {
      SystemService: this.#systemService,
      IdentityService: identityService,
      ContactsService: resolved.contactsService,

      InvitationsService: resolved.invitationsService,

      DevicesService: resolved.devicesService,

      SpacesService: resolved.spacesService,

      DataService: resolved.dataService,
      QueryService: resolved.queryService,
      FeedService: resolved.feedService,

      NetworkService: resolved.networkService,

      LoggingService: this.#loggingService,

      // TODO(burdon): Move to new protobuf definitions.
      DevtoolsHost: new DevtoolsServiceImpl({
        events: new DevtoolsHostEvents(),
        config: this.#config,
        context: this.#serviceContext,
        exportSqliteDatabase: () => this.exportSqliteDatabase(),
        runSqliteQuery: (query, params) => this.runSqliteQuery(query, params),
      }),

      EdgeAgentService: resolved.edgeAgentService,
    };

    log('service-host: opening service context...');
    await this.#serviceContext.open(ctx);
    log('service-host: service context opened');

    log('service-host: opening identity service...');
    await identityService.open();
    log('service-host: identity service opened');

    const devtoolsProxy = this.#config?.get('runtime.client.devtoolsProxy');
    if (devtoolsProxy) {
      // TODO(dxos): The devtools websocket proxy serves the protobuf service bundle, which is
      // incompatible with the effect-rpc Handlers the host now provides. Re-enable once this legacy
      // transport is migrated to effect-rpc (or bridged via makeInProcessClient + a proto adapter).
      log.warn('devtoolsProxy is not supported with effect-rpc services; skipping', { devtoolsProxy });
    }
    this.#diagnosticsBroadcastHandler.start();

    this.#opening = false;
    this.#open = true;
    this.#statusUpdate.emit();
    const deviceKey = this.#serviceContext.identityManager.identity?.deviceKey;
    log('opened', { deviceKey });
  }

  @synchronized
  @Trace.span()
  async close(ctx: Context): Promise<void> {
    if (!this.#open) {
      return;
    }

    const deviceKey = this.#serviceContext.identityManager.identity?.deviceKey;
    log('closing...', { deviceKey });
    this.#diagnosticsBroadcastHandler.stop();
    await this.#devtoolsProxy?.close();
    this.#handlers = { SystemService: this.#systemService };
    await this.#loggingService.close();
    await this.#serviceContext.close();
    await this.#stackRuntime?.dispose();
    this.#stackRuntime = undefined;
    this.#open = false;
    this.#statusUpdate.emit();
    log('closed', { deviceKey });
  }

  async reset(): Promise<void> {
    log.info('resetting...');
    // Emit this status update immediately so app returns to fallback.
    // This state is never cleared because the app reloads.
    this.#resetting = true;
    this.#statusUpdate.emit();
    await this.#serviceContext?.close();
    // Wipe all SQLite tables so next open starts fresh.
    await RuntimeProvider.runPromise(this.#runtime)(
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
    await this.#callbacks?.onReset?.();
  }
}

/**
 * Context tag for the {@link ClientServicesHost}. Lets Effect consumers resolve the host as a service
 * rather than threading a `new ClientServicesHost(...)` instance through constructors.
 */
export class ClientServicesHostService extends EffectContext.Tag('@dxos/client-services/ClientServicesHost')<
  ClientServicesHostService,
  ClientServicesHost
>() {}

/**
 * Layer that constructs a {@link ClientServicesHost} from its props and exposes it under
 * {@link ClientServicesHostService}. Host lifecycle (`open` / `close`) stays caller-driven — the host
 * is a long-lived resource whose open/close are gated on external locks — so this only owns
 * construction, matching how {@link WorkerRuntime} and {@link LocalClientServices} build the host today.
 */
export const layerClientServicesHost = (props: ClientServicesHostProps): Layer.Layer<ClientServicesHostService> =>
  Layer.sync(ClientServicesHostService, () => new ClientServicesHost(props));
