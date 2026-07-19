//
// Copyright 2021 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';
import * as Runtime from 'effect/Runtime';
import * as Scope from 'effect/Scope';

import { Event, Mutex, Trigger, synchronized } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesHandlers,
  makeInProcessClientServicesRpc,
  makeServicesFromRpc,
} from '@dxos/client-protocol';
import { type Config, resolveTelemetryTag } from '@dxos/config';
import { Context } from '@dxos/context';
import { failUndefined, warnAfterTimeout } from '@dxos/debug';
import {
  type AutomergeReplicator,
  type EchoHost,
  EchoHostService,
  type EdgeAutomergeReplicator,
  EdgeAutomergeReplicatorService,
  MeshEchoReplicatorService,
  runSqliteHealthCheck,
} from '@dxos/echo-host';
import {
  type EdgeApiClientService,
  EdgeApiService,
  EdgeClient,
  type EdgeConnection,
  EdgeHttpClient,
  type EdgeIdentity,
  createChainEdgeIdentity,
  createEphemeralEdgeIdentity,
  createStubEdgeIdentity,
} from '@dxos/edge-client';
import { EffectEx, RuntimeProvider } from '@dxos/effect';
import { type FeedStore, FeedStoreService } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type KeyringApi, KeyringApiService } from '@dxos/keyring';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeSignalManager, type SignalManager, SignalManagerService, WebsocketSignalManager } from '@dxos/messaging';
import {
  SwarmNetworkManager,
  SwarmNetworkManagerService,
  type TransportFactory,
  createIceProvider,
  createRtcTransportFactory,
} from '@dxos/network-manager';
import { InvalidStorageVersionError, STORAGE_VERSION } from '@dxos/protocols';
import { Invitation, SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
import { type Credential, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import type * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';
import { type BlobStoreApi, BlobStoreApiService } from '@dxos/teleport-extension-object-sync';
import { trace as Trace } from '@dxos/tracing';
import { WebsocketRpcClient } from '@dxos/websocket-rpc';

import { type EdgeAgentManager, EdgeAgentManagerService } from '../agents';
import { DevtoolsHostEvents, DevtoolsServiceImpl } from '../devtools';
import {
  type CollectDiagnosticsBroadcastHandler,
  createCollectDiagnosticsBroadcastHandler,
  createDiagnostics,
} from '../diagnostics';
import {
  type CreateIdentityOptions,
  type Identity,
  type IdentityManager,
  IdentityManagerService,
  type JoinIdentityProps,
} from '../identity';
import {
  type EdgeIdentityRecoveryManager,
  EdgeIdentityRecoveryManagerService,
} from '../identity/identity-recovery-manager';
import {
  DeviceInvitationProtocol,
  type InvitationProtocol,
  type InvitationsHandler,
  InvitationsHandlerService,
  type InvitationsManager,
  InvitationsManagerService,
  SpaceInvitationProtocol,
} from '../invitations';
import { Lock, type ResourceLock } from '../locks';
import { LoggingServiceImpl } from '../logging';
import { type IMetadataStore, IMetadataStoreService } from '../metadata';
import { type SpaceManager, SpaceManagerService } from '../space';
import {
  type DataSpaceManager,
  DataSpaceManagerService,
  type SigningContextProvider,
  SigningContextProviderService,
} from '../spaces';
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
  type CrossDeviceSpaceSynchronizer,
  CrossDeviceSpaceSynchronizerService,
} from './cross-device-space-synchronizer';
import { type FeedSyncer, FeedSyncerService } from './feed-syncer';
import {
  ServiceContextLayer,
  type ServiceContextRuntimeProps,
  type ServiceContextStackContext,
  StorageMigrationService,
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

// Alias for consumers (tests, devtools, diagnostics) that referred to the former `ServiceContext`
// orchestrator; its lifecycle and API now live on {@link ClientServicesHost} directly.
export type ServiceContext = ClientServicesHost;

/**
 * Shared backend for all client services.
 *
 * Owns the full client stack and its lifecycle: it builds the layer-composed components (keyring,
 * feed store, echo host, identity/space managers, …) plus the client RPC handlers, then drives the
 * open sequence (migrate → identity → network → space initialization) and teardown. It reads or
 * creates the identity, propagates it outward (`_setNetworkIdentity`), and opens the identity-bound
 * services once an identity is available (`_initialize`). The host provides itself into the stack
 * (via {@link ClientServicesHostService}) so the RPC handler layers can resolve the orchestration
 * entry points they need without a separate `ServiceContext` service.
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
  // Derived Effect-native edge client, provided alongside `#edgeHttpClient` while consumers migrate
  // group-by-group. Currently backs the agents endpoints (see `EdgeAgentManager`).
  #edgeApiClient?: EdgeApiClientService = undefined;

  #stackRuntime?: ManagedRuntime.ManagedRuntime<
    ClientServicesHostService | ClientServicesRpcContext | ServiceContextStackContext,
    never
  >;
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
  #metadataStore?: IMetadataStore;
  #blobStore?: BlobStoreApi;
  #keyring?: KeyringApi;
  #feedStore?: FeedStore<any>;
  #spaceManager?: SpaceManager;
  #identityManager?: IdentityManager;
  #recoveryManager?: EdgeIdentityRecoveryManager;
  #invitations?: InvitationsHandler;
  #invitationsManager?: InvitationsManager;
  #echoHost?: EchoHost;
  #signingContextProvider?: SigningContextProvider;
  #dataSpaceManager?: DataSpaceManager;
  #edgeAgentManager?: EdgeAgentManager;
  #deviceSpaceSync?: CrossDeviceSpaceSynchronizer;
  #meshReplicator?: AutomergeReplicator;
  #echoEdgeReplicator?: EdgeAutomergeReplicator;
  #feedSyncer?: FeedSyncer;
  #storageMigrate?: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransaction.SqlTransaction>;

  // Orchestration state (formerly on `ServiceContext`).
  readonly #initialized = new Trigger();
  readonly #edgeIdentityUpdateMutex = new Mutex();
  readonly #handlerFactories = new Map<Invitation.Kind, (invitation: Partial<Invitation>) => InvitationProtocol>();

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

  // Self-reference retained for the former `host.context` accessor.
  get context(): ClientServicesHost {
    return this;
  }

  get services() {
    return this.#handlers;
  }

  get initialized() {
    return this.#initialized;
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

  get blobStore(): BlobStoreApi {
    return this.#blobStore ?? failUndefined();
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

    const endpoint = config?.get('runtime.services.edge.url');
    if (endpoint) {
      const clientTag = resolveTelemetryTag(config);
      this.#edgeConnection = new EdgeClient(createStubEdgeIdentity(), { socketEndpoint: endpoint, clientTag });
      this.#edgeHttpClient = new EdgeHttpClient(endpoint, { clientTag });
      this.#edgeApiClient = EdgeApiService.make({ baseUrl: endpoint, clientTag });
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
  async open(ctx: Context = new Context()): Promise<void> {
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
    this.#ctx = ctx;
    log('opening...', { lockKey: this.#resourceLock?.lockKey });

    await this.#resourceLock?.acquire();

    await this.#loggingService.open();

    // Build a single runtime from the component layer stack plus the client RPC handlers, providing
    // the host itself so the handler layers can resolve their orchestration entry points.
    const stackLayer = ClientServicesRpcLayer.pipe(
      Layer.provideMerge(Layer.succeed(ClientServicesHostService, this)),
      Layer.provideMerge(
        ServiceContextLayer({
          ...this.#runtimeProps,
          edgeFeatures: config.get('runtime.client.edgeFeatures'),
          edgeConnection: this.#edgeConnection,
          edgeHttpClient: this.#edgeHttpClient,
          edgeApiClient: this.#edgeApiClient,
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
        // Components.
        metadataStore: IMetadataStoreService,
        blobStore: BlobStoreApiService,
        keyring: KeyringApiService,
        feedStore: FeedStoreService,
        spaceManager: SpaceManagerService,
        identityManager: IdentityManagerService,
        recoveryManager: EdgeIdentityRecoveryManagerService,
        invitations: InvitationsHandlerService,
        invitationsManager: InvitationsManagerService,
        echoHost: EchoHostService,
        signingContextProvider: SigningContextProviderService,
        dataSpaceManager: DataSpaceManagerService,
        edgeAgentManager: EdgeAgentManagerService,
        deviceSpaceSync: CrossDeviceSpaceSynchronizerService,
        storageMigrate: StorageMigrationService,
        meshReplicator: Effect.serviceOption(MeshEchoReplicatorService),
        echoEdgeReplicator: Effect.serviceOption(EdgeAutomergeReplicatorService),
        feedSyncer: Effect.serviceOption(FeedSyncerService),
        // Handlers.
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

    this.#metadataStore = resolved.metadataStore;
    this.#blobStore = resolved.blobStore;
    this.#keyring = resolved.keyring;
    this.#feedStore = resolved.feedStore;
    this.#spaceManager = resolved.spaceManager;
    this.#identityManager = resolved.identityManager;
    this.#recoveryManager = resolved.recoveryManager;
    this.#invitations = resolved.invitations;
    this.#invitationsManager = resolved.invitationsManager;
    this.#echoHost = resolved.echoHost;
    this.#signingContextProvider = resolved.signingContextProvider;
    this.#dataSpaceManager = resolved.dataSpaceManager;
    this.#edgeAgentManager = resolved.edgeAgentManager;
    this.#deviceSpaceSync = resolved.deviceSpaceSync;
    this.#storageMigrate = resolved.storageMigrate;
    this.#meshReplicator = Option.getOrUndefined(resolved.meshReplicator);
    this.#echoEdgeReplicator = Option.getOrUndefined(resolved.echoEdgeReplicator);
    this.#feedSyncer = Option.getOrUndefined(resolved.feedSyncer);

    // Wire the setters for components that point "up the stack".
    this.#handlerFactories.set(
      Invitation.Kind.DEVICE,
      () =>
        new DeviceInvitationProtocol(
          this.#keyring!,
          () => this.#identityManager!.identity ?? failUndefined(),
          this._acceptIdentity.bind(this),
        ),
    );
    this.#recoveryManager.setAcceptRecoveredIdentity((params) => this._acceptIdentity(params));
    this.#invitationsManager.setInvitationHandlerFactory((invitation) => this.getInvitationHandler(invitation));
    this.#echoHost.setFeedSyncHandlers({
      syncFeed: async (feedSyncCtx, request) =>
        this.#feedSyncer?.syncBlocking(feedSyncCtx, {
          spaceId: request.spaceId as SpaceId,
          subspaceTag: request.subspaceTag,
          shouldPush: request.shouldPush,
          shouldPull: request.shouldPull,
        }),
      getSyncState: async (feedSyncCtx, request) => {
        if (!this.#feedSyncer) {
          return { namespaces: [] };
        }
        return this.#feedSyncer.getSyncState(feedSyncCtx, request);
      },
    });

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
        context: this,
        exportSqliteDatabase: () => this.exportSqliteDatabase(),
        runSqliteQuery: (query, params) => this.runSqliteQuery(query, params),
      }),
      EdgeAgentService: resolved.edgeAgentService,
    };

    // Run the open lifecycle stages (formerly ServiceContext._open).
    await this._openStack(ctx);

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
    const deviceKey = this.#identityManager?.identity?.deviceKey;
    log('opened', { deviceKey });
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
    await this.#loggingService.close();
    await this._closeStack(ctx);
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
    if (this.#open) {
      await this._closeStack(this.#ctx ?? Context.default());
    }
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

  //
  // Orchestration (formerly ServiceContext).
  //

  async createIdentity(params: CreateIdentityOptions = {}, ctx?: Context): Promise<Identity> {
    ctx ??= this.#ctx ?? Context.default();
    const identity = await this.identityManager.createIdentity(params, ctx);
    await this._setNetworkIdentity({ identity });
    await identity.joinNetwork(ctx);
    await this._initialize(ctx);
    return identity;
  }

  getInvitationHandler(invitation: Partial<Invitation> & Pick<Invitation, 'kind'>): InvitationProtocol {
    if (this.identityManager.identity == null && invitation.kind === Invitation.Kind.SPACE) {
      throw new Error('Identity must be created before joining a space.');
    }
    const factory = this.#handlerFactories.get(invitation.kind);
    invariant(factory, `Unknown invitation kind: ${invitation.kind}`);
    return factory(invitation);
  }

  async broadcastProfileUpdate(profile: ProfileDocument | undefined): Promise<void> {
    if (!profile || !this.#dataSpaceManager) {
      return;
    }
    for (const space of this.#dataSpaceManager.spaces.values()) {
      await space.updateOwnProfile(profile);
    }
  }

  /**
   * Resolves the {@link DataSpaceManager} once identity-bound services have opened (`initialized`).
   */
  async whenDataSpaceManagerReady(): Promise<DataSpaceManager> {
    await this.#initialized.wait();
    return this.#dataSpaceManager ?? failUndefined();
  }

  /**
   * Resolves the {@link EdgeAgentManager} once identity-bound services have opened (`initialized`).
   */
  async whenEdgeAgentManagerReady(): Promise<EdgeAgentManager> {
    await this.#initialized.wait();
    return this.#edgeAgentManager ?? failUndefined();
  }

  private async _acceptIdentity(params: JoinIdentityProps): Promise<Identity> {
    const ctx = this.#ctx ?? Context.default();
    const { identity, identityRecord } = await this.identityManager.prepareIdentity(params, ctx);
    await this._setNetworkIdentity({ deviceCredential: params.authorizedDeviceCredential!, identity });
    await identity.joinNetwork(ctx);
    await this.identityManager.acceptIdentity(identity, identityRecord, params.deviceProfile);
    await this._initialize(ctx);
    return identity;
  }

  private async _checkStorageVersion(): Promise<void> {
    await this.metadataStore.load();
    if (this.metadataStore.version !== STORAGE_VERSION) {
      throw new InvalidStorageVersionError(STORAGE_VERSION, this.metadataStore.version);
      // TODO(mykola): Migrate storage to a new version if incompatibility is detected.
    }
  }

  /**
   * Opens the identity-bound services once an identity is available.
   */
  @Trace.span()
  private async _initialize(ctx: Context): Promise<void> {
    log('_initialize: start');
    const identity = this.identityManager.identity ?? failUndefined();

    await this.#dataSpaceManager!.open(ctx);
    log('_initialize: DataSpaceManager opened');

    await this.#edgeAgentManager!.open(ctx);
    log('_initialize: EdgeAgentManager opened');

    this.#handlerFactories.set(
      Invitation.Kind.SPACE,
      (invitation) =>
        new SpaceInvitationProtocol(
          this.#dataSpaceManager!,
          this.#signingContextProvider!(),
          this.#keyring!,
          invitation.spaceKey,
        ),
    );
    this.#initialized.wake();

    this.#deviceSpaceSync!.setIdentity(identity);
    await this.#deviceSpaceSync!.open?.(ctx);
  }

  private async _setNetworkIdentity(params?: { deviceCredential?: Credential; identity?: Identity }): Promise<void> {
    log('_setNetworkIdentity: acquiring mutex...');
    using _ = await this.#edgeIdentityUpdateMutex.acquire();
    log('_setNetworkIdentity: mutex acquired');

    let edgeIdentity: EdgeIdentity;
    const identity = params?.identity;
    if (identity) {
      if (params?.deviceCredential) {
        edgeIdentity = await createChainEdgeIdentity(
          identity.signer,
          identity.identityKey,
          identity.deviceKey,
          { credential: params.deviceCredential },
          [], // TODO(dmaretskyi): Service access credentials.
        );
      } else {
        // TODO: throw here or from identity if device chain can't be loaded, to avoid indefinite hangup
        await warnAfterTimeout(10_000, 'Waiting for identity to be ready for edge connection', async () => {
          await identity.ready();
        });

        invariant(identity.deviceCredentialChain);

        edgeIdentity = await createChainEdgeIdentity(
          identity.signer,
          identity.identityKey,
          identity.deviceKey,
          identity.deviceCredentialChain,
          [], // TODO(dmaretskyi): Service access credentials.
        );
      }
    } else {
      edgeIdentity = await createEphemeralEdgeIdentity();
    }

    this.#edgeConnection?.setIdentity(edgeIdentity);
    this.#edgeHttpClient?.setIdentity(edgeIdentity);
    if (this.#edgeApiClient) {
      // `setIdentity` is a synchronous `Ref` update; run it eagerly so the derived agents client
      // presents the current identity on its next request.
      Effect.runSync(this.#edgeApiClient.setIdentity(edgeIdentity));
    }
    this.networkManager.setPeerInfo({
      identityDid: edgeIdentity.identityDid,
      peerKey: edgeIdentity.peerKey,
    });
    log('_setNetworkIdentity: done');
  }

  /**
   * Open lifecycle stages over the resolved stack components (formerly ServiceContext._open).
   */
  private async _openStack(ctx: Context): Promise<void> {
    log('running storage migrations...');
    await RuntimeProvider.runPromise(this.#runtime)(this.#storageMigrate!);

    await this._checkStorageVersion();

    log('running sqlite health check...');
    await runSqliteHealthCheck(this.#runtime);
    log('sqlite health check passed');

    log('opening identityManager...');
    await this.#identityManager!.open(ctx);
    log('identityManager opened', { hasIdentity: !!this.#identityManager!.identity });

    log('setting network identity...');
    await this._setNetworkIdentity({ identity: this.#identityManager!.identity });

    log('opening edge connection...');
    await this.#edgeConnection?.open(ctx);

    log('opening signal manager...');
    await this.#signalManager!.open(ctx);

    log('opening network manager...');
    await this.#networkManager!.open();

    // EchoHost open/close is owned by its layer scope; the host is already open here.
    if (this.#meshReplicator) {
      log('adding mesh replicator...');
      await this.#echoHost!.addReplicator(ctx, this.#meshReplicator);
    }
    if (this.#echoEdgeReplicator) {
      log('adding edge replicator...');
      await this.#echoHost!.addReplicator(ctx, this.#echoEdgeReplicator);
    }

    log('loading metadata store...');
    await this.#metadataStore!.load();

    log('opening space manager...');
    await this.#spaceManager!.open();

    if (this.#identityManager!.identity) {
      log('joining network...');
      await this.#identityManager!.identity.joinNetwork(ctx);

      log('initializing spaces...');
      await this._initialize(ctx);
    } else {
      log('no identity, skipping network join and space initialization');
    }

    log('opening feed syncer...');
    await this.#feedSyncer?.open(ctx);

    log('loading persistent invitations...');
    const loadedInvitations = await this.#invitationsManager!.loadPersistentInvitations(ctx);
    log('loaded persistent invitations', { count: loadedInvitations.invitations?.length });

    log('stack opened');
  }

  /**
   * Close lifecycle stages (formerly ServiceContext._close).
   */
  private async _closeStack(ctx: Context): Promise<void> {
    log('closing stack...');
    await this.#feedSyncer?.close();
    await this.#deviceSpaceSync?.close?.();
    await this.#dataSpaceManager?.close(ctx);
    await this.#edgeAgentManager?.close();
    await this.#identityManager?.close(ctx);
    await this.#spaceManager?.close();
    // EchoHost close is owned by its layer scope and runs when the runtime is disposed.

    await this.#networkManager?.close(ctx);
    await this.#signalManager?.close();
    await this.#edgeConnection?.close();
    await this.#feedStore?.close();
    await this.#metadataStore?.close();
    log('stack closed');
  }
}

/**
 * Context tag for the {@link ClientServicesHost}. The host provides itself under this tag when it
 * builds its component stack, so client RPC handler layers can resolve the orchestration entry
 * points (`createIdentity`, readiness gates, …) they need.
 */
export class ClientServicesHostService extends EffectContext.Tag('@dxos/client-services/ClientServicesHost')<
  ClientServicesHostService,
  ClientServicesHost
>() {}

/**
 * Layer that constructs a {@link ClientServicesHost} from its props and exposes it under
 * {@link ClientServicesHostService}. Host lifecycle (`open` / `close`) stays caller-driven.
 */
export const layerClientServicesHost = (props: ClientServicesHostProps): Layer.Layer<ClientServicesHostService> =>
  Layer.sync(ClientServicesHostService, () => new ClientServicesHost(props));
