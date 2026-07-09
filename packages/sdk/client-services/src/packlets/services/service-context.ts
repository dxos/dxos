//
// Copyright 2022 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { Mutex, Trigger } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { failUndefined, warnAfterTimeout } from '@dxos/debug';
import {
  type AutomergeReplicator,
  EchoEdgeReplicatorLayer,
  EchoEdgeSubductionReplicatorLayer,
  type EchoHost,
  EchoHostLayer,
  EchoHostService,
  type EdgeAutomergeReplicator,
  EdgeAutomergeReplicatorService,
  type IMetadataStore,
  IMetadataStoreService,
  MeshEchoReplicatorLayer,
  MeshEchoReplicatorService,
  type SpaceManager,
  SpaceManagerLayer,
  SpaceManagerService,
  SqliteMetadataStore,
  SqliteMetadataStoreLayer,
  runSqliteHealthCheck,
  valueEncoding,
} from '@dxos/echo-host';
import { createChainEdgeIdentity, createEphemeralEdgeIdentity } from '@dxos/edge-client';
import {
  type EdgeConnection,
  EdgeConnectionService,
  type EdgeHttpClient,
  EdgeHttpClientService,
  type EdgeIdentity,
} from '@dxos/edge-client';
import { RuntimeProvider } from '@dxos/effect';
import { FeedFactoryLayer, type FeedStore, FeedStoreLayer, FeedStoreService } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type KeyringApi, KeyringApiService, SqliteKeyring, SqliteKeyringLayer } from '@dxos/keyring';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type SignalManager, SignalManagerService } from '@dxos/messaging';
import { type SwarmNetworkManager, SwarmNetworkManagerService } from '@dxos/network-manager';
import { FeedProtocol, InvalidStorageVersionError, STORAGE_VERSION } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type Credential, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { SqlTransaction } from '@dxos/sql-sqlite';
import {
  type BlobStoreApi,
  BlobStoreApiService,
  SqliteBlobStore,
  SqliteBlobStoreLayer,
} from '@dxos/teleport-extension-object-sync';
import { trace as Trace } from '@dxos/tracing';
import { safeInstanceof } from '@dxos/util';

import { EdgeAgentManager, EdgeAgentManagerLayer, EdgeAgentManagerService } from '../agents';
import {
  type CreateIdentityOptions,
  type Identity,
  IdentityManager,
  IdentityManagerLayer,
  type IdentityManagerProps,
  IdentityManagerService,
  IdentityProviderService,
  type JoinIdentityProps,
  identityProviderFromManager,
} from '../identity';
import {
  EdgeIdentityRecoveryManager,
  EdgeIdentityRecoveryManagerLayer,
  EdgeIdentityRecoveryManagerService,
} from '../identity/identity-recovery-manager';
import {
  DeviceInvitationProtocol,
  type InvitationConnectionProps,
  type InvitationProtocol,
  InvitationsHandler,
  InvitationsHandlerLayer,
  InvitationsHandlerService,
  InvitationsManager,
  InvitationsManagerLayer,
  InvitationsManagerService,
  SpaceInvitationProtocol,
} from '../invitations';
import {
  DataSpaceManager,
  DataSpaceManagerLayer,
  type DataSpaceManagerRuntimeProps,
  DataSpaceManagerService,
  type SigningContextProvider,
  SigningContextProviderLayer,
  SigningContextProviderService,
} from '../spaces';
import {
  type CrossDeviceSpaceSynchronizer,
  CrossDeviceSpaceSynchronizerLayer,
  CrossDeviceSpaceSynchronizerService,
} from './cross-device-space-synchronizer';
import { FeedSyncer, FeedSyncerLayer, FeedSyncerService } from './feed-syncer';
import { FeedStorageDirectoryLayer, SqliteStorage, SqliteStorageLayer } from './sqlite-storage';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

export type ServiceContextRuntimeProps = Pick<
  IdentityManagerProps,
  'devicePresenceOfflineTimeout' | 'devicePresenceAnnounceInterval'
> &
  DataSpaceManagerRuntimeProps & {
    invitationConnectionDefaultProps?: InvitationConnectionProps;
    disableP2pReplication?: boolean;
    enableVectorIndexing?: boolean;
  };

export interface ServiceContextApi {
  createIdentity(params: CreateIdentityOptions, ctx?: Context): Promise<Identity>;
  getInvitationHandler(invitation: Partial<Invitation> & Pick<Invitation, 'kind'>): InvitationProtocol;
  broadcastProfileUpdate(profile: ProfileDocument | undefined): Promise<void>;
}

/**
 * The concrete {@link ServiceContext} resolved from the composed stack.
 */
export class ServiceContextService extends EffectContext.Tag('@dxos/client-services/ServiceContext')<
  ServiceContextService,
  ServiceContext
>() {}

/**
 * Combined storage migration effect gathered from the concrete SQLite stores.
 * Internal to the stack; run by {@link ServiceContext} during open (stage 2).
 */
class StorageMigrationService extends EffectContext.Tag('@dxos/client-services/StorageMigration')<
  StorageMigrationService,
  Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag>
>() {}

/**
 * Injected components for {@link ServiceContext}.
 */
export type ServiceContextOptions = {
  networkManager: SwarmNetworkManager;
  signalManager: SignalManager;
  edgeConnection?: EdgeConnection;
  edgeHttpClient?: EdgeHttpClient;
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;

  metadataStore: IMetadataStore;
  blobStore: BlobStoreApi;
  keyring: KeyringApi;
  feedStore: FeedStore<FeedMessage>;
  storageMigrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag>;

  spaceManager: SpaceManager;
  identityManager: IdentityManager;
  recoveryManager: EdgeIdentityRecoveryManager;
  invitations: InvitationsHandler;
  invitationsManager: InvitationsManager;
  echoHost: EchoHost;
  signingContextProvider: SigningContextProvider;

  dataSpaceManager: DataSpaceManager;
  edgeAgentManager: EdgeAgentManager;
  deviceSpaceSync: CrossDeviceSpaceSynchronizer;

  meshReplicator?: AutomergeReplicator;
  echoEdgeReplicator?: EdgeAutomergeReplicator;
  feedSyncer?: FeedSyncer;

  runtimeProps?: ServiceContextRuntimeProps;
  edgeFeatures?: Runtime.Client.EdgeFeatures;
};

/**
 * Shared backend for all client services.
 *
 * Lifecycle orchestrator over the layer-composed components: it drives migrate/open, reads or
 * creates the identity, propagates it outward (`_setNetworkIdentity`), and opens the identity-bound
 * services in stage 3 (`_initialize`). Components themselves are constructed dormant by the stack.
 */
@safeInstanceof('dxos.client-services.ServiceContext')
export class ServiceContext extends Resource implements ServiceContextApi {
  readonly #edgeIdentityUpdateMutex = new Mutex();

  public readonly initialized = new Trigger();

  public readonly networkManager: SwarmNetworkManager;
  public readonly signalManager: SignalManager;
  public readonly metadataStore: IMetadataStore;
  public readonly blobStore: BlobStoreApi;
  public readonly keyring: KeyringApi;
  public readonly feedStore: FeedStore<FeedMessage>;
  public readonly spaceManager: SpaceManager;
  public readonly identityManager: IdentityManager;
  public readonly recoveryManager: EdgeIdentityRecoveryManager;
  public readonly invitations: InvitationsHandler;
  public readonly invitationsManager: InvitationsManager;
  public readonly echoHost: EchoHost;

  // Identity-bound services: always constructed by the stack, opened in `_initialize`.
  readonly #dataSpaceManager: DataSpaceManager;
  readonly #edgeAgentManager: EdgeAgentManager;
  readonly #deviceSpaceSync: CrossDeviceSpaceSynchronizer;
  readonly #signingContextProvider: SigningContextProvider;

  readonly #edgeConnection: EdgeConnection | undefined;
  readonly #edgeHttpClient: EdgeHttpClient | undefined;
  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
  readonly #storageMigrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag>;
  readonly #meshReplicator: AutomergeReplicator | undefined;
  readonly #echoEdgeReplicator: EdgeAutomergeReplicator | undefined;
  readonly #feedSyncer: FeedSyncer | undefined;

  public readonly _runtimeProps?: ServiceContextRuntimeProps;
  readonly #edgeFeatures?: Runtime.Client.EdgeFeatures;

  readonly #handlerFactories = new Map<Invitation.Kind, (invitation: Partial<Invitation>) => InvitationProtocol>();

  constructor(options: ServiceContextOptions) {
    super();

    this.networkManager = options.networkManager;
    this.signalManager = options.signalManager;
    this.#edgeConnection = options.edgeConnection;
    this.#edgeHttpClient = options.edgeHttpClient;
    this.#runtime = options.runtime;

    this.metadataStore = options.metadataStore;
    this.blobStore = options.blobStore;
    this.keyring = options.keyring;
    this.feedStore = options.feedStore;
    this.#storageMigrate = options.storageMigrate;

    this.spaceManager = options.spaceManager;
    this.identityManager = options.identityManager;
    this.recoveryManager = options.recoveryManager;
    this.invitations = options.invitations;
    this.invitationsManager = options.invitationsManager;
    this.echoHost = options.echoHost;
    this.#signingContextProvider = options.signingContextProvider;

    this.#dataSpaceManager = options.dataSpaceManager;
    this.#edgeAgentManager = options.edgeAgentManager;
    this.#deviceSpaceSync = options.deviceSpaceSync;

    this.#meshReplicator = options.meshReplicator;
    this.#echoEdgeReplicator = options.echoEdgeReplicator;
    this.#feedSyncer = options.feedSyncer;

    this._runtimeProps = options.runtimeProps;
    this.#edgeFeatures = options.edgeFeatures;

    log('runtimeProps', this._runtimeProps);
    log('edgeFeatures', this.#edgeFeatures);

    this.#handlerFactories.set(
      Invitation.Kind.DEVICE,
      () =>
        new DeviceInvitationProtocol(
          this.keyring,
          () => this.identityManager.identity ?? failUndefined(),
          this._acceptIdentity.bind(this),
        ),
    );

    // Wire the setters for components that point "up the stack".
    this.recoveryManager.setAcceptRecoveredIdentity((params) => this._acceptIdentity(params));
    this.invitationsManager.setInvitationHandlerFactory((invitation) => this.getInvitationHandler(invitation));
    this.echoHost.setFeedSyncHandlers({
      syncFeed: async (ctx, request) =>
        this.#feedSyncer?.syncBlocking(ctx, {
          // Proto carries spaceId as an unbranded string.
          spaceId: request.spaceId as SpaceId,
          subspaceTag: request.subspaceTag,
          shouldPush: request.shouldPush,
          shouldPull: request.shouldPull,
        }),
      getSyncState: async (ctx, request) => {
        // In non-edge / partially-initialised modes the feed syncer is absent. Return an empty
        // state instead of throwing so callers (e.g. devtools sync panel) keep working.
        if (!this.#feedSyncer) {
          return { namespaces: [] };
        }
        return this.#feedSyncer.getSyncState(ctx, request);
      },
    });
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
   * Resolves the {@link DataSpaceManager} once identity-bound services have opened (`initialized`).
   * The manager is always constructed by the stack, so no null-check is needed after the wait.
   */
  async whenDataSpaceManagerReady(): Promise<DataSpaceManager> {
    await this.initialized.wait();
    return this.#dataSpaceManager;
  }

  /**
   * Resolves the {@link EdgeAgentManager} once identity-bound services have opened (`initialized`).
   */
  async whenEdgeAgentManagerReady(): Promise<EdgeAgentManager> {
    await this.initialized.wait();
    return this.#edgeAgentManager;
  }

  @Trace.span({ op: 'lifecycle' })
  protected override async _open(ctx: Context): Promise<void> {
    log('running storage migrations...');
    await RuntimeProvider.runPromise(this.#runtime)(this.#storageMigrate);

    await this._checkStorageVersion();

    log('running sqlite health check...');
    await runSqliteHealthCheck(this.#runtime);
    log('sqlite health check passed');

    log('opening identityManager...');
    await this.identityManager.open(ctx);
    log('identityManager opened', { hasIdentity: !!this.identityManager.identity });

    log('setting network identity...');
    await this._setNetworkIdentity({ identity: this.identityManager.identity });

    log('opening edge connection...');
    await this.#edgeConnection?.open(ctx);

    log('opening signal manager...');
    await this.signalManager.open(ctx);

    log('opening network manager...');
    await this.networkManager.open();

    log('opening echo host...');
    await this.echoHost.open(ctx);

    if (this.#meshReplicator) {
      log('adding mesh replicator...');
      await this.echoHost.addReplicator(ctx, this.#meshReplicator);
    }
    if (this.#echoEdgeReplicator) {
      log('adding edge replicator...');
      await this.echoHost.addReplicator(ctx, this.#echoEdgeReplicator);
    }

    log('loading metadata store...');
    await this.metadataStore.load();

    log('opening space manager...');
    await this.spaceManager.open();

    if (this.identityManager.identity) {
      log('joining network...');
      await this.identityManager.identity.joinNetwork(ctx);

      log('initializing spaces...');
      await this._initialize(ctx);
    } else {
      log('no identity, skipping network join and space initialization');
    }

    log('opening feed syncer...');
    await this.#feedSyncer?.open(ctx);

    log('loading persistent invitations...');
    const loadedInvitations = await this.invitationsManager.loadPersistentInvitations(ctx);
    log('loaded persistent invitations', { count: loadedInvitations.invitations?.length });

    log('opened');
  }

  protected override async _close(ctx: Context): Promise<void> {
    log('closing...');

    await this.#feedSyncer?.close();
    await this.#deviceSpaceSync.close?.();
    await this.#dataSpaceManager.close(ctx);
    await this.#edgeAgentManager.close();
    await this.identityManager.close(ctx);
    await this.spaceManager.close();
    await this.echoHost.close(ctx);

    await this.networkManager.close(ctx);
    await this.signalManager.close();
    await this.#edgeConnection?.close();
    await this.feedStore.close();
    await this.metadataStore.close();

    log('closed');
  }

  async createIdentity(params: CreateIdentityOptions = {}, ctx?: Context) {
    ctx ??= this._ctx;
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
    if (!profile) {
      return;
    }

    for (const space of this.#dataSpaceManager.spaces.values()) {
      await space.updateOwnProfile(profile);
    }
  }

  private async _acceptIdentity(params: JoinIdentityProps) {
    const { identity, identityRecord } = await this.identityManager.prepareIdentity(params, this._ctx);
    await this._setNetworkIdentity({ deviceCredential: params.authorizedDeviceCredential!, identity });
    await identity.joinNetwork(this._ctx);
    await this.identityManager.acceptIdentity(identity, identityRecord, params.deviceProfile);
    await this._initialize(this._ctx);
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
   * Stage 3: opens the identity-bound services once an identity is available.
   */
  @Trace.span()
  private async _initialize(ctx: Context): Promise<void> {
    log('_initialize: start');
    const identity = this.identityManager.identity ?? failUndefined();

    await this.#dataSpaceManager.open(ctx);
    log('_initialize: DataSpaceManager opened');

    await this.#edgeAgentManager.open(ctx);
    log('_initialize: EdgeAgentManager opened');

    this.#handlerFactories.set(
      Invitation.Kind.SPACE,
      (invitation) =>
        new SpaceInvitationProtocol(
          this.#dataSpaceManager,
          this.#signingContextProvider(),
          this.keyring,
          invitation.spaceKey,
        ),
    );
    this.initialized.wake();

    this.#deviceSpaceSync.setIdentity(identity);
    await this.#deviceSpaceSync.open?.(ctx);
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
    this.networkManager.setPeerInfo({
      identityDid: edgeIdentity.identityDid,
      peerKey: edgeIdentity.peerKey,
    });
    log('_setNetworkIdentity: done');
  }
}

export type ServiceContextLayerOptions = ServiceContextRuntimeProps & {
  edgeFeatures?: Runtime.Client.EdgeFeatures;
  edgeConnection?: EdgeConnection;
  edgeHttpClient?: EdgeHttpClient;
};

/**
 * Effect Layer composing dormant {@link ServiceContext} components, constructed before identity is
 * ready. The resulting {@link ServiceContextService} yields the lifecycle orchestrator.
 */
export const ServiceContextLayer = (
  options: ServiceContextLayerOptions,
): Layer.Layer<
  ServiceContextService,
  never,
  SwarmNetworkManagerService | SignalManagerService | SqlClient.SqlClient | SqlTransactionTag
> => {
  const { edgeConnection, edgeHttpClient } = options;

  // Non-edge: just the core beneath the orchestrator.
  if (!edgeConnection || !edgeHttpClient) {
    return serviceContextServiceLayer(options).pipe(Layer.provideMerge(coreLayers(options)));
  }

  // Edge: the optional feed-syncer / edge-replicator sit above the core so their `EchoHostService`
  // requirement is satisfied by it, and the edge inputs are provided internally at the bottom.
  return serviceContextServiceLayer(options).pipe(
    Layer.provideMerge(feedSyncerLayer),
    Layer.provideMerge(edgeReplicatorLayer(options)),
    Layer.provideMerge(coreLayers(options)),
    Layer.provideMerge(edgeInputLayer(edgeConnection, edgeHttpClient)),
  );
};

/**
 * Yields the {@link ServiceContext} orchestrator from the resolved stack components.
 */
const serviceContextServiceLayer = (options: ServiceContextLayerOptions) =>
  Layer.effect(
    ServiceContextService,
    Effect.gen(function* () {
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransactionTag>();
      const networkManager = yield* SwarmNetworkManagerService;
      const signalManager = yield* SignalManagerService;

      const metadataStore = yield* IMetadataStoreService;
      const blobStore = yield* BlobStoreApiService;
      const keyring = yield* KeyringApiService;
      const feedStore = yield* FeedStoreService;
      const storageMigrate = yield* StorageMigrationService;

      const spaceManager = yield* SpaceManagerService;
      const identityManager = yield* IdentityManagerService;
      const recoveryManager = yield* EdgeIdentityRecoveryManagerService;
      const invitations = yield* InvitationsHandlerService;
      const invitationsManager = yield* InvitationsManagerService;
      const echoHost = yield* EchoHostService;
      const signingContextProvider = yield* SigningContextProviderService;

      const dataSpaceManager = yield* DataSpaceManagerService;
      const edgeAgentManager = yield* EdgeAgentManagerService;
      const deviceSpaceSync = yield* CrossDeviceSpaceSynchronizerService;

      const meshReplicator = Option.getOrUndefined(yield* Effect.serviceOption(MeshEchoReplicatorService));
      const echoEdgeReplicator = Option.getOrUndefined(yield* Effect.serviceOption(EdgeAutomergeReplicatorService));
      const feedSyncer = Option.getOrUndefined(yield* Effect.serviceOption(FeedSyncerService));

      return new ServiceContext({
        networkManager,
        signalManager,
        edgeConnection: options.edgeConnection,
        edgeHttpClient: options.edgeHttpClient,
        runtime,
        metadataStore,
        blobStore,
        keyring,
        feedStore,
        storageMigrate,
        spaceManager,
        identityManager,
        recoveryManager,
        invitations,
        invitationsManager,
        echoHost,
        signingContextProvider,
        dataSpaceManager,
        edgeAgentManager,
        deviceSpaceSync,
        meshReplicator,
        echoEdgeReplicator,
        feedSyncer,
        runtimeProps: options,
        edgeFeatures: options.edgeFeatures,
      });
    }),
  );

/**
 * Composes the non-optional core layers into a single stack that callers merge beneath their top layer.
 */
const coreLayers = (options: ServiceContextLayerOptions) =>
  CrossDeviceSpaceSynchronizerLayer.pipe(
    Layer.provideMerge(EdgeAgentManagerLayer({ edgeFeatures: options.edgeFeatures })),
    Layer.provideMerge(DataSpaceManagerLayer({ runtimeProps: options, edgeFeatures: options.edgeFeatures })),
    Layer.provideMerge(SigningContextProviderLayer),
    Layer.provideMerge(identityProviderLayer),
    Layer.provideMerge(meshReplicatorLayer(options)),
    Layer.provideMerge(echoHostLayer({ useSubduction: options.edgeFeatures?.subductionReplicator })),
    Layer.provideMerge(InvitationsManagerLayer()),
    Layer.provideMerge(InvitationsHandlerLayer({ connectionProps: options.invitationConnectionDefaultProps })),
    Layer.provideMerge(EdgeIdentityRecoveryManagerLayer()),
    Layer.provideMerge(
      IdentityManagerLayer({
        devicePresenceOfflineTimeout: options.devicePresenceOfflineTimeout,
        devicePresenceAnnounceInterval: options.devicePresenceAnnounceInterval,
        edgeFeatures: options.edgeFeatures,
      }),
    ),
    Layer.provideMerge(SpaceManagerLayer({ disableP2pReplication: options.disableP2pReplication })),
    Layer.provideMerge(storageLayer),
  );

/**
 * Optional mesh replicator: read via `serviceOption`, so its `ROut` is hidden (`Layer<never>`) —
 * absence when p2p is disabled is modelled by not providing it, not by a null value.
 */
const meshReplicatorLayer = (options: ServiceContextLayerOptions): Layer.Layer<never, never, never> =>
  options.disableP2pReplication ? Layer.empty : MeshEchoReplicatorLayer();

/**
 * Optional edge replicator (subduction / echo / none) — `ROut` hidden, read via `serviceOption`.
 */
const edgeReplicatorLayer = (
  options: ServiceContextLayerOptions,
): Layer.Layer<never, never, EdgeConnectionService | EdgeHttpClientService> =>
  options.edgeFeatures?.subductionReplicator
    ? EchoEdgeSubductionReplicatorLayer()
    : options.edgeFeatures?.echoReplicator
      ? EchoEdgeReplicatorLayer()
      : Layer.empty;

/**
 * Provides the edge inputs internally so they never appear in the stack's declared requirements.
 */
const edgeInputLayer = (
  edgeConnection: EdgeConnection,
  edgeHttpClient: EdgeHttpClient,
): Layer.Layer<EdgeConnectionService | EdgeHttpClientService> =>
  Layer.mergeAll(
    Layer.succeed(EdgeConnectionService, edgeConnection),
    Layer.succeed(EdgeHttpClientService, edgeHttpClient),
  );

/**
 * Optional feed syncer (only wired into the stack when edge is configured).
 */
const feedSyncerLayer = FeedSyncerLayer({
  peerId: '',
  syncNamespaces: [FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace],
});

/**
 * Provides the {@link IdentityProviderService} from the resolved {@link IdentityManager}.
 */
const identityProviderLayer = Layer.effect(
  IdentityProviderService,
  Effect.gen(function* () {
    const identityManager = yield* IdentityManagerService;
    return identityProviderFromManager(identityManager);
  }),
);

/**
 * Combined storage migration effect. Storage migrations are idempotent `CREATE TABLE` effects that
 * do not depend on store instance state, so they are extracted from throwaway instances to keep the
 * store layers individual. Run in stage 2 by {@link ServiceContext._open}.
 */
const storageMigrationLayer = Layer.effect(
  StorageMigrationService,
  Effect.gen(function* () {
    const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransactionTag>();
    return Effect.all(
      [
        new SqliteMetadataStore({ runtime }).migrate,
        new SqliteBlobStore({ runtime }).migrate,
        new SqliteKeyring({ runtime }).migrate,
        new SqliteStorage({ runtime }).migrate,
      ],
      { discard: true },
    );
  }),
);

/**
 * Storage / feed layers composed from the individual store layers plus the combined migration.
 */
const storageLayer = Layer.empty.pipe(
  Layer.provideMerge(FeedStoreLayer()),
  Layer.provideMerge(FeedFactoryLayer({ hypercore: { valueEncoding, stats: true } })),
  Layer.provideMerge(FeedStorageDirectoryLayer()),
  Layer.provideMerge(SqliteMetadataStoreLayer()),
  Layer.provideMerge(SqliteBlobStoreLayer()),
  Layer.provideMerge(SqliteKeyringLayer()),
  Layer.provideMerge(SqliteStorageLayer()),
  Layer.provideMerge(storageMigrationLayer),
);

/**
 * Constructs the {@link EchoHost}, resolving the identity/space callbacks that point down the stack.
 * The feed sync handlers (which point up) are wired later via `EchoHost.setFeedSyncHandlers`.
 */
const echoHostLayer = (options: { useSubduction?: boolean }) =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const identityManager = yield* IdentityManagerService;
      const spaceManager = yield* SpaceManagerService;
      return EchoHostLayer({
        peerIdProvider: () => identityManager.identity?.deviceKey?.toHex(),
        getSpaceKeyByRootDocumentId: (documentId) => spaceManager.findSpaceByRootDocumentId(documentId)?.key,
        useSubduction: options.useSubduction,
      });
    }),
  );
