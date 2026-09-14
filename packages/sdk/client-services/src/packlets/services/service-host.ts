//
// Copyright 2021 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Scope from 'effect/Scope';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { Event, synchronized } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesHandlers,
  makeInProcessClientServicesRpc,
  makeServicesFromRpc,
} from '@dxos/client-protocol';
import { type Config, ConfigService, resolveTelemetryTag } from '@dxos/config';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { type EchoHost, EchoHostService } from '@dxos/echo-host';
import { EdgeClient, type EdgeConnection, EdgeHttpClient, createStubEdgeIdentity } from '@dxos/edge-client';
import { Event as EffectEvent, EffectEx, RuntimeProvider } from '@dxos/effect';
import { type FeedStore, FeedStoreService } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type KeyringApi, KeyringApiService } from '@dxos/keyring';
import { log } from '@dxos/log';
import {
  EdgeSignalManager,
  MemorySignalManager,
  MemorySignalManagerContext,
  type SignalManager,
  SignalManagerService,
} from '@dxos/messaging';
import { type SwarmNetworkManager, SwarmNetworkManagerService, type TransportFactory } from '@dxos/network-manager';
import { SystemStatus } from '@dxos/protocols/buf/dxos/client/services_pb';
import {
  ContactsService,
  DataService,
  DevicesService,
  EdgeAgentService,
  FeedService,
  IdentityService,
  InvitationsService,
  LoggingService,
  NetworkService,
  QueryService,
  SpacesService,
} from '@dxos/protocols/rpc';
import type * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import type * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';
import { trace as Trace } from '@dxos/tracing';
import { WebsocketRpcClient } from '@dxos/websocket-rpc';

import { type EdgeAgentManager, EdgeAgentManagerService } from '../agents/index.ts';
import { DevtoolsHostService, type DevtoolsServiceImpl } from '../devtools/index.ts';
import {
  type CollectDiagnosticsBroadcastHandler,
  createCollectDiagnosticsBroadcastHandler,
  createDiagnostics,
} from '../diagnostics/index.ts';
import {
  type EdgeIdentityRecoveryManager,
  EdgeIdentityRecoveryManagerService,
} from '../identity/identity-recovery-manager.ts';
import {
  type CreateIdentityOptions,
  type Identity,
  type IdentityLifecycle,
  IdentityLifecycleService,
  type IdentityManager,
  IdentityManagerService,
} from '../identity/index.ts';
import {
  type InvitationsHandler,
  InvitationsHandlerService,
  type InvitationsManager,
  InvitationsManagerService,
} from '../invitations/index.ts';
import { Lock, type ResourceLock } from '../locks/index.ts';
import { type IMetadataStore, IMetadataStoreService } from '../metadata/index.ts';
import { type SpaceManager, SpaceManagerService } from '../space/index.ts';
import { type DataSpaceManager, DataSpaceManagerService } from '../spaces/index.ts';
import { SystemServiceImpl } from '../system/index.ts';
import { type ClientServicesRpcContext, ClientServicesRpcLayer } from './client-services-layer.ts';
import { NetworkingEnabled, Opening, StackOpened } from './events.ts';
import { type ServiceContextRuntimeProps, type ServiceContextStackContext, ServiceStack } from './service-stack.ts';
import { type StackReadiness, StackReadinessService } from './stack-readiness.ts';

/**
 * Everything the host's stack runtime provides: the event bus, the component layers, and the RPC
 * handler layers.
 */
export type ClientServicesStackContext = EffectEvent.Bus | ClientServicesRpcContext | ServiceContextStackContext;

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
  /**
   * Start edge networking as soon as the stack is open. Set `false` when the embedder drives it via
   * {@link ClientServicesHost.startNetworking} — the worker does, so the dial cannot compete with
   * the boot RPCs the tab is waiting on.
   * @default true
   */
  autoConnect?: boolean;
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

// Alias for consumers (tests, devtools, diagnostics) that referred to the former `ServiceContext`
// orchestrator; its lifecycle and API now live on {@link ClientServicesHost} directly.
// TODO(dmaretskyi): Remove this update consumers.
export type ServiceContext = ClientServicesHost;

/**
 * Shared backend for all client services.
 *
 * Owns the full client stack and its lifecycle: it builds the layer-composed components (keyring,
 * feed store, echo host, identity/space managers, …) plus the client RPC handlers. The open sequence
 * is an event chain (see `events.ts`): the host emits `Opening` and each layer opens its component on
 * the event it needs and emits the fact it establishes; `StackOpened` follows once the cascade is
 * done. Teardown is runtime disposal, which runs the layer finalizers in reverse build order.
 */
export class ClientServicesHost {
  readonly #resourceLock?: ResourceLock;
  // Effect-rpc handlers served over each connection, resolved from the Layer stack on open and reset
  // to the host-local set on close. Held directly (no separate registry indirection).
  #handlers: Partial<ClientServicesHandlers>;
  readonly #systemService: SystemServiceImpl;
  readonly #statusUpdate = new Event<void>();

  #config?: Config;
  #signalManager?: SignalManager;
  #networkManager?: SwarmNetworkManager;
  #transportFactory?: TransportFactory;
  #connectionLog = true;
  #callbacks?: ClientServicesHostCallbacks;
  #devtoolsProxy?: WebsocketRpcClient<{}, ClientServices>;
  #edgeConnection?: EdgeConnection = undefined;
  #edgeHttpClient?: EdgeHttpClient = undefined;

  #stackRuntime?: ManagedRuntime.ManagedRuntime<ClientServicesStackContext, never>;
  #stackContext?: EffectContext.Context<ClientServicesStackContext>;
  readonly #runtime: RuntimeProvider.RuntimeProvider<
    SqlClient.SqlClient | SqlExport.SqlExport | SqlTransaction.SqlTransaction
  >;
  readonly #runtimeProps: ServiceContextRuntimeProps;
  #diagnosticsBroadcastHandler: CollectDiagnosticsBroadcastHandler;

  #opening = false;
  #open = false;
  #resetting = false;

  // Stack components, resolved from the layer runtime on open. Present after `open` starts.
  #ctx?: Context;

  /** See {@link ClientServicesHostProps.autoConnect}. */
  readonly #autoConnect: boolean;
  #metadataStore?: IMetadataStore;
  #keyring?: KeyringApi;
  #feedStore?: FeedStore<any>;
  #spaceManager?: SpaceManager;
  #identityManager?: IdentityManager;
  #recoveryManager?: EdgeIdentityRecoveryManager;
  #invitations?: InvitationsHandler;
  #invitationsManager?: InvitationsManager;
  #echoHost?: EchoHost;
  #dataSpaceManager?: DataSpaceManager;
  #edgeAgentManager?: EdgeAgentManager;
  #identityLifecycle?: IdentityLifecycle;
  #readiness?: StackReadiness;
  #devtoolsHost?: DevtoolsServiceImpl;

  constructor({
    config,
    transportFactory,
    signalManager,
    // TODO(wittjosiah): Turn this on by default.
    lockKey,
    callbacks,
    autoConnect = true,
    runtime,
    runtimeProps,
  }: ClientServicesHostProps) {
    this.#callbacks = callbacks;
    this.#autoConnect = autoConnect;
    this.#runtime = runtime;
    this.#runtimeProps = runtimeProps ?? {};

    if (config) {
      this.initialize({ config, transportFactory, signalManager });
    }

    if (lockKey) {
      // Stays outside the stack: the lock decides whether to build the runtime at all, and releasing
      // it is what tears the runtime down, so no layer inside it can own the lock.
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
          const services = makeServicesFromRpc(rpc, EffectContext.empty());
          return await createDiagnostics(services, this, this.#config!);
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

  // Self-reference retained for the former `host.context` accessor.
  // TODO(dmaretskyi): kill this.
  get context(): ClientServicesHost {
    return this;
  }

  get services() {
    return this.#handlers;
  }

  /**
   * Effect context of the built stack: every component and RPC handler layer. Present while open.
   */
  get stack(): EffectContext.Context<ClientServicesStackContext> {
    return this.#stackContext ?? failUndefined();
  }

  get initialized() {
    return (this.#readiness ?? failUndefined()).initialized;
  }

  get identityManager(): IdentityManager {
    return this.#identityManager ?? failUndefined();
  }

  get spaceManager(): SpaceManager {
    return this.#spaceManager ?? failUndefined();
  }

  get metadataStore(): IMetadataStore {
    return this.#metadataStore ?? failUndefined();
  }

  get recoveryManager(): EdgeIdentityRecoveryManager {
    return this.#recoveryManager ?? failUndefined();
  }

  get keyring(): KeyringApi {
    return this.#keyring ?? failUndefined();
  }

  get feedStore(): FeedStore<any> {
    return this.#feedStore ?? failUndefined();
  }

  get echoHost(): EchoHost {
    return this.#echoHost ?? failUndefined();
  }

  get invitations(): InvitationsHandler {
    return this.#invitations ?? failUndefined();
  }

  get invitationsManager(): InvitationsManager {
    return this.#invitationsManager ?? failUndefined();
  }

  get networkManager(): SwarmNetworkManager {
    return this.#networkManager ?? failUndefined();
  }

  get signalManager(): SignalManager {
    return this.#signalManager ?? failUndefined();
  }

  // Present after the stack constructs it; usable once `initialized` wakes.
  get dataSpaceManager(): DataSpaceManager | undefined {
    return this.#dataSpaceManager;
  }

  get edgeAgentManager(): EdgeAgentManager | undefined {
    return this.#edgeAgentManager;
  }

  get edgeConnection(): EdgeConnection | undefined {
    return this.#edgeConnection;
  }

  /**
   * Debugging util.
   */
  async exportSqliteDatabase(): Promise<Uint8Array> {
    return (this.#devtoolsHost ?? failUndefined()).exportSqliteDatabase();
  }

  /**
   * Debugging util.
   */
  async runSqliteQuery(query: string, params?: unknown[]): Promise<readonly Record<string, unknown>[]> {
    return (this.#devtoolsHost ?? failUndefined()).runSqliteQuery(query, params);
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
      if (this.#runtimeProps.automergeCredentials === undefined) {
        this.#runtimeProps.automergeCredentials = config?.get('runtime.client.automergeCredentials', false);
      }

      invariant(!this.#config, 'config already set');
      this.#config = config;
    }

    const endpoint = config?.get('runtime.services.edge.url');
    if (endpoint) {
      const clientTag = resolveTelemetryTag(config);
      // Dialing is driven by `startNetworking()` rather than `open()`, so the host controls when
      // outbound work is allowed to compete with boot.
      this.#edgeConnection = new EdgeClient(createStubEdgeIdentity(), {
        socketEndpoint: endpoint,
        clientTag,
        deferConnect: true,
      });
      this.#edgeHttpClient = new EdgeHttpClient(endpoint, { clientTag });
    }

    const {
      connectionLog = true,
      transportFactory,
      // Edge is the only real signaling transport; without it fall back to an isolated in-memory
      // manager (no cross-process signaling). The former KUBE `WebsocketSignalManager` is removed.
      signalManager = this.#edgeConnection && this.#config?.get('runtime.client.edgeFeatures')?.signaling
        ? new EdgeSignalManager({ edgeConnection: this.#edgeConnection })
        : new MemorySignalManager(new MemorySignalManagerContext()),
    } = options;
    this.#signalManager = signalManager;
    this.#transportFactory = transportFactory;
    this.#connectionLog = connectionLog;

    log('initialized');
  }

  @synchronized
  @Trace.span()
  async open(ctx: Context = new Context()): Promise<void> {
    if (this.#open) {
      return;
    }

    log('opening service host');

    invariant(this.#config, 'config not set');
    invariant(this.#signalManager, 'signal manager not set');
    const config = this.#config;
    const signalManager = this.#signalManager;

    this.#opening = true;
    this.#ctx = ctx;
    log('opening...', { lockKey: this.#resourceLock?.lockKey });

    await this.#resourceLock?.acquire();

    // Build a single runtime from the component layer stack plus the client RPC handlers.
    const stackLayer = ClientServicesRpcLayer.pipe(
      Layer.provideMerge(
        ServiceStack({
          ...this.#runtimeProps,
          edgeFeatures: config.get('runtime.client.edgeFeatures'),
          edgeConnection: this.#edgeConnection,
          edgeHttpClient: this.#edgeHttpClient,
          transportFactory: this.#transportFactory,
          connectionLog: this.#connectionLog,
          autoConnect: this.#autoConnect,
        }),
      ),
      Layer.provideMerge(Layer.succeed(SignalManagerService, signalManager)),
      Layer.provideMerge(Layer.succeed(ConfigService, config)),
      Layer.provideMerge(EffectEvent.busLayer),
      Layer.provideMerge(RuntimeProvider.toLayer(this.#runtime)),
      Layer.orDie,
    );
    try {
      this.#stackRuntime = ManagedRuntime.make(stackLayer);
      this.#stackContext = await this.#stackRuntime.context();
      const resolved = await this.#stackRuntime.runPromise(
        Effect.all({
          // Components.
          metadataStore: IMetadataStoreService,
          keyring: KeyringApiService,
          feedStore: FeedStoreService,
          spaceManager: SpaceManagerService,
          identityManager: IdentityManagerService,
          recoveryManager: EdgeIdentityRecoveryManagerService,
          invitations: InvitationsHandlerService,
          invitationsManager: InvitationsManagerService,
          echoHost: EchoHostService,
          dataSpaceManager: DataSpaceManagerService,
          edgeAgentManager: EdgeAgentManagerService,
          identityLifecycle: IdentityLifecycleService,
          readiness: StackReadinessService,
          networkManager: SwarmNetworkManagerService,
          // Handlers.
          identityService: IdentityService.Tag,
          contactsService: ContactsService.Tag,
          invitationsService: InvitationsService.Tag,
          devicesService: DevicesService.Tag,
          spacesService: SpacesService.Tag,
          networkService: NetworkService.Tag,
          edgeAgentService: EdgeAgentService.Tag,
          dataService: DataService.Tag,
          queryService: QueryService.Tag,
          feedService: FeedService.Tag,
          loggingService: LoggingService.Tag,
          devtoolsHost: DevtoolsHostService,
        }),
      );

      this.#metadataStore = resolved.metadataStore;
      this.#keyring = resolved.keyring;
      this.#feedStore = resolved.feedStore;
      this.#spaceManager = resolved.spaceManager;
      this.#identityManager = resolved.identityManager;
      this.#recoveryManager = resolved.recoveryManager;
      this.#invitations = resolved.invitations;
      this.#invitationsManager = resolved.invitationsManager;
      this.#echoHost = resolved.echoHost;
      this.#dataSpaceManager = resolved.dataSpaceManager;
      this.#edgeAgentManager = resolved.edgeAgentManager;
      this.#identityLifecycle = resolved.identityLifecycle;
      this.#readiness = resolved.readiness;
      this.#devtoolsHost = resolved.devtoolsHost;
      this.#networkManager = resolved.networkManager;

      this.#handlers = {
        SystemService: this.#systemService,
        IdentityService: resolved.identityService,
        ContactsService: resolved.contactsService,
        InvitationsService: resolved.invitationsService,
        DevicesService: resolved.devicesService,
        SpacesService: resolved.spacesService,
        DataService: resolved.dataService,
        QueryService: resolved.queryService,
        FeedService: resolved.feedService,
        NetworkService: resolved.networkService,
        LoggingService: resolved.loggingService,
        DevtoolsHost: resolved.devtoolsHost,
        EdgeAgentService: resolved.edgeAgentService,
      };

      await this._openStack(ctx);
    } catch (err) {
      // One rollback boundary for building the runtime and running the open chain. Only the runtime
      // is released: the stores below it are not closed, since the metadata store persists on close
      // and nothing guarantees the storage stage loaded it.
      await this.#stackRuntime?.dispose();
      this.#releaseStack();
      this.#handlers = { SystemService: this.#systemService };
      this.#opening = false;
      throw err;
    }

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
    const deviceKey = this.#identityManager?.identity?.deviceKey;
    log('opened', { deviceKey });
  }

  /**
   * Allows outbound network activity to begin. Idempotent. Emitted automatically when the stack
   * opens unless {@link ClientServicesHostProps.autoConnect} is `false`, in which case the embedder
   * decides when connecting is safe (and owns any delay).
   */
  startNetworking(): void {
    if (!this.#stackRuntime) {
      log.warn('startNetworking called before the stack is open; ignoring');
      return;
    }
    void this.#emit(NetworkingEnabled, undefined);
  }

  @synchronized
  @Trace.span()
  async close(ctx: Context = Context.default()): Promise<void> {
    if (!this.#open) {
      return;
    }

    const deviceKey = this.#identityManager?.identity?.deviceKey;
    log('closing...', { deviceKey });
    this.#diagnosticsBroadcastHandler.stop();
    await this.#devtoolsProxy?.close();
    this.#handlers = { SystemService: this.#systemService };
    await this.#disposeStack();
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
    if (this.#open) {
      await this.close();
    }
    // Wipe all SQLite tables so next open starts fresh.
    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        // Echo metadata + large space data.
        yield* sql`DELETE FROM space_metadata`;
        yield* sql`DELETE FROM space_large`;
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

  //
  // Orchestration (formerly ServiceContext).
  //

  async createIdentity(params: CreateIdentityOptions = {}, ctx?: Context): Promise<Identity> {
    return (this.#identityLifecycle ?? failUndefined()).createIdentity(params, ctx ?? this.#ctx);
  }

  /**
   * Starts the open event chain; each emit returns once every handler it triggered (transitively)
   * has completed, so `StackOpened` fires after storage, identity, network, and spaces are up.
   */
  private async _openStack(ctx: Context): Promise<void> {
    await this.#emit(Opening, undefined, ctx);
    await this.#emit(StackOpened, undefined, ctx);
    log('stack opened');
  }

  /**
   * Disposes the stack runtime, closing every layer-owned component in reverse build order. The
   * stores below the stack close last, and only here: the metadata store persists on close, so it
   * must never close from a layer that was built without the storage stage having loaded it.
   */
  async #disposeStack(): Promise<void> {
    log('closing stack...');
    await this.#stackRuntime?.dispose();
    await this.#feedStore?.close();
    await this.#metadataStore?.close();
    this.#releaseStack();
    log('stack closed');
  }

  /**
   * Drops every reference into a disposed runtime so the getters cannot hand out dead instances.
   */
  #releaseStack(): void {
    this.#stackRuntime = undefined;
    this.#stackContext = undefined;
    this.#metadataStore = undefined;
    this.#keyring = undefined;
    this.#feedStore = undefined;
    this.#spaceManager = undefined;
    this.#identityManager = undefined;
    this.#recoveryManager = undefined;
    this.#invitations = undefined;
    this.#invitationsManager = undefined;
    this.#echoHost = undefined;
    this.#dataSpaceManager = undefined;
    this.#edgeAgentManager = undefined;
    this.#identityLifecycle = undefined;
    this.#readiness = undefined;
    this.#devtoolsHost = undefined;
    this.#networkManager = undefined;
  }

  /**
   * Emits on the stack bus; under `ctx` the handlers nest under its trace and stop when it disposes.
   */
  #emit<E extends EffectEvent.Any>(event: E, payload: EffectEvent.Payload<E>, ctx?: Context): Promise<void> {
    invariant(this.#stackRuntime, 'stack runtime not built');
    const emit = EffectEvent.emit(event, payload);
    return this.#stackRuntime.runPromise(ctx ? EffectEx.withContext(ctx)(emit) : emit);
  }
}
