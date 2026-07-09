//
// Copyright 2022 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';

import { Mutex, Trigger } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { failUndefined, todo, warnAfterTimeout } from '@dxos/debug';
import {
  EchoEdgeReplicator,
  EchoEdgeSubductionReplicator,
  EchoHost,
  EchoHostLayer,
  type EchoHostLayerOptions,
  type EchoHostProps,
  type EchoHostService,
  type EdgeAutomergeReplicator,
  type IMetadataStoreService,
  MeshEchoReplicator,
  MeshEchoReplicatorLayer,
  SpaceManager,
  SpaceManagerLayer,
  SpaceManagerService,
  SqliteMetadataStore,
  SqliteMetadataStoreLayer,
  runSqliteHealthCheck,
  valueEncoding,
} from '@dxos/echo-host';
import { createChainEdgeIdentity, createEphemeralEdgeIdentity } from '@dxos/edge-client';
import type {
  EdgeConnection,
  EdgeConnectionService,
  EdgeHttpClient,
  EdgeHttpClientService,
  EdgeIdentity,
} from '@dxos/edge-client';
import { RuntimeProvider } from '@dxos/effect';
import {
  FeedFactory,
  FeedFactoryLayer,
  FeedStore,
  FeedStoreLayer,
  type FeedFactoryService,
  type FeedStorageDirectoryService,
  type FeedStoreService,
} from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { SqliteKeyring, SqliteKeyringLayer, type KeyringApiService } from '@dxos/keyring';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type SignalManager } from '@dxos/messaging';
import { type SwarmNetworkManager, type SwarmNetworkManagerService } from '@dxos/network-manager';
import { InvalidStorageVersionError, STORAGE_VERSION } from '@dxos/protocols';
import { FeedProtocol } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type Credential, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { SqliteBlobStore, SqliteBlobStoreLayer, type BlobStoreApiService } from '@dxos/teleport-extension-object-sync';
import { trace as Trace } from '@dxos/tracing';
import { safeInstanceof } from '@dxos/util';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

import * as EffectContext from 'effect/Context';
import * as Layer from 'effect/Layer';

import { EdgeAgentManager } from '../agents';
import {
  type CreateIdentityOptions,
  type Identity,
  IdentityManager,
  IdentityManagerLayer,
  type IdentityManagerProps,
  IdentityManagerService,
  type JoinIdentityProps,
  identityProviderFromManager,
} from '../identity';
import {
  EdgeIdentityRecoveryManager,
  EdgeIdentityRecoveryManagerLayer,
  type EdgeIdentityRecoveryManagerService,
} from '../identity/identity-recovery-manager';
import {
  DeviceInvitationProtocol,
  type InvitationConnectionProps,
  type InvitationProtocol,
  InvitationsHandler,
  InvitationsHandlerLayer,
  type InvitationsHandlerService,
  InvitationsManager,
  InvitationsManagerLayer,
  type InvitationsManagerLayerOptions,
  type InvitationsManagerService,
  SpaceInvitationProtocol,
} from '../invitations';
import { DataSpaceManager, type DataSpaceManagerRuntimeProps, createSigningContextProvider } from '../spaces';
import {
  createCrossDeviceSpaceSynchronizer,
  type CrossDeviceSpaceSynchronizer,
} from './cross-device-space-synchronizer';
import { FeedSyncer, FeedSyncerService } from './feed-syncer';
import {
  FeedStorageDirectoryLayer,
  SqliteStorage,
  SqliteStorageLayer,
  type SqliteStorageService,
} from './sqlite-storage';

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

export class ServiceContextService extends EffectContext.Tag('@dxos/client-services/ServiceContext')<
  ServiceContextService,
  ServiceContextApi
>() {}

/**
 * Shared backend for all client services.
 */
// TODO(burdon): Rename/break-up into smaller components. And/or make members private.
// TODO(dmaretskyi): Gets duplicated in CJS build between normal and testing bundles.
@safeInstanceof('dxos.client-services.ServiceContext')
@Trace.resource({ lifecycle: true })
export class ServiceContext extends Resource implements ServiceContextApi {
  private readonly _edgeIdentityUpdateMutex = new Mutex();

  public readonly initialized = new Trigger();
  public readonly metadataStore: SqliteMetadataStore;
  public readonly blobStore: SqliteBlobStore;
  public readonly feedStore: FeedStore<FeedMessage>;
  public readonly keyring: SqliteKeyring;
  public readonly spaceManager: SpaceManager;
  public readonly identityManager: IdentityManager;
  public readonly recoveryManager: EdgeIdentityRecoveryManager;
  public readonly invitations: InvitationsHandler;
  public readonly invitationsManager: InvitationsManager;
  public readonly echoHost: EchoHost;
  private readonly _meshReplicator?: MeshEchoReplicator = undefined;
  private readonly _echoEdgeReplicator?: EdgeAutomergeReplicator = undefined;
  private readonly _feedSyncer?: FeedSyncer = undefined;
  private readonly _feedStorage: SqliteStorage;

  // Initialized after identity is initialized.
  public dataSpaceManager?: DataSpaceManager;
  public edgeAgentManager?: EdgeAgentManager;

  private readonly _handlerFactories = new Map<
    Invitation.Kind,
    (invitation: Partial<Invitation>) => InvitationProtocol
  >();

  private _deviceSpaceSync?: CrossDeviceSpaceSynchronizer;

  constructor(
    public readonly networkManager: SwarmNetworkManager,
    public readonly signalManager: SignalManager,
    private readonly _edgeConnection: EdgeConnection | undefined,
    private readonly _edgeHttpClient: EdgeHttpClient | undefined,
    private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>,
    public readonly _runtimeProps?: ServiceContextRuntimeProps,
    private readonly _edgeFeatures?: Runtime.Client.EdgeFeatures,
  ) {
    super();

    log('runtimeProps', this._runtimeProps);
    log('edgeFeatures', this._edgeFeatures);

    this.metadataStore = new SqliteMetadataStore({ runtime: this._runtime });
    this.blobStore = new SqliteBlobStore({ runtime: this._runtime });
    this.keyring = new SqliteKeyring({ runtime: this._runtime });
    this._feedStorage = new SqliteStorage({ runtime: this._runtime });
    const feedStorage = this._feedStorage;
    this.feedStore = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: feedStorage.createDirectory('feeds'),
        signer: this.keyring,
        hypercore: {
          valueEncoding,
          stats: true,
        },
      }),
    });

    this.spaceManager = new SpaceManager({
      feedStore: this.feedStore,
      networkManager: this.networkManager,
      blobStore: this.blobStore,
      metadataStore: this.metadataStore,
      disableP2pReplication: this._runtimeProps?.disableP2pReplication,
    });

    this.identityManager = new IdentityManager({
      metadataStore: this.metadataStore,
      keyring: this.keyring,
      feedStore: this.feedStore,
      spaceManager: this.spaceManager,
      devicePresenceOfflineTimeout: this._runtimeProps?.devicePresenceOfflineTimeout,
      devicePresenceAnnounceInterval: this._runtimeProps?.devicePresenceAnnounceInterval,
      edgeConnection: this._edgeConnection,
      edgeFeatures: this._edgeFeatures,
    });

    this.recoveryManager = new EdgeIdentityRecoveryManager(
      this.keyring,
      this._edgeHttpClient,
      () => this.identityManager.identity,
    );

    this.echoHost = new EchoHost({
      peerIdProvider: () => this.identityManager.identity?.deviceKey?.toHex(),
      getSpaceKeyByRootDocumentId: (documentId) => this.spaceManager.findSpaceByRootDocumentId(documentId)?.key,
      runtime: this._runtime,
      useSubduction: this._edgeFeatures?.subductionReplicator,
      syncFeed: async (ctx, request) => {
        return this._feedSyncer?.syncBlocking(ctx, {
          spaceId: request.spaceId as SpaceId,
          subspaceTag: request.subspaceTag,
          shouldPush: request.shouldPush,
          shouldPull: request.shouldPull,
        });
      },
      getSyncState: async (ctx, request) => {
        // Mirror `syncFeed` above: in non-edge / partially-initialised modes the
        // feed syncer is absent. Return an empty state instead of throwing so
        // callers (e.g. devtools sync panel) keep working.
        if (!this._feedSyncer) {
          return { namespaces: [] };
        }
        return this._feedSyncer.getSyncState(ctx, request);
      },
    });

    this.invitations = new InvitationsHandler(
      this.networkManager, //
      this._edgeHttpClient,
      _runtimeProps?.invitationConnectionDefaultProps,
    );
    this.invitationsManager = new InvitationsManager(
      this.invitations,
      (invitation) => this.getInvitationHandler(invitation),
      this.metadataStore,
    );

    // TODO(burdon): _initialize called in multiple places.
    // TODO(burdon): Call _initialize on success.
    this._handlerFactories.set(
      Invitation.Kind.DEVICE,
      () =>
        new DeviceInvitationProtocol(
          this.keyring,
          () => this.identityManager.identity ?? failUndefined(),
          this._acceptIdentity.bind(this),
        ),
    );

    if (!this._runtimeProps?.disableP2pReplication) {
      this._meshReplicator = new MeshEchoReplicator();
    }
    if (this._edgeConnection && this._edgeHttpClient) {
      if (this._edgeFeatures?.subductionReplicator) {
        this._echoEdgeReplicator = new EchoEdgeSubductionReplicator({
          edgeConnection: this._edgeConnection,
          edgeHttpClient: this._edgeHttpClient,
        });
      } else if (this._edgeFeatures?.echoReplicator) {
        this._echoEdgeReplicator = new EchoEdgeReplicator({
          edgeConnection: this._edgeConnection,
          edgeHttpClient: this._edgeHttpClient,
        });
      }
    }

    if (this.echoHost.feedStore && this._edgeConnection) {
      this._feedSyncer = new FeedSyncer({
        runtime: this._runtime,
        feedStore: this.echoHost.feedStore,
        edgeClient: this._edgeConnection,
        peerId: this.identityManager.identity?.deviceKey?.toHex() ?? '',
        getSpaceIds: () => this.echoHost!.spaceIds,
        syncNamespaces: [FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace],
      });
    }

    this.recoveryManager.setAcceptRecoveredIdentity((params) => this._acceptIdentity(params));
  }

  @Trace.span({ op: 'lifecycle' })
  protected override async _open(ctx: Context): Promise<void> {
    await RuntimeProvider.runPromise(this._runtime)(
      Effect.all([this.metadataStore.migrate, this.blobStore.migrate, this.keyring.migrate, this._feedStorage.migrate]),
    );

    await this._checkStorageVersion();

    log('running sqlite health check...');
    await runSqliteHealthCheck(this._runtime);
    log('sqlite health check passed');

    log('opening...');

    log('opening identityManager...');
    await this.identityManager.open(ctx);
    log('identityManager opened', { hasIdentity: !!this.identityManager.identity });

    log('setting network identity...');
    await this._setNetworkIdentity({ identity: this.identityManager.identity });
    log('network identity set');

    log('opening edge connection...');
    await this._edgeConnection?.open(ctx);
    log('edge connection opened');

    log('opening signal manager...');
    await this.signalManager.open(ctx);
    log('signal manager opened');

    log('opening network manager...');
    await this.networkManager.open();
    log('network manager opened');

    log('opening echo host...');
    await this.echoHost.open(ctx);
    log('echo host opened');

    if (this._meshReplicator) {
      log('adding mesh replicator...');
      await this.echoHost.addReplicator(ctx, this._meshReplicator);
      log('mesh replicator added');
    }
    if (this._echoEdgeReplicator) {
      log('adding edge replicator...');
      await this.echoHost.addReplicator(ctx, this._echoEdgeReplicator);
      log('edge replicator added');
    }

    log('loading metadata store...');
    await this.metadataStore.load();
    log('metadata store loaded');

    log('opening space manager...');
    await this.spaceManager.open();
    log('space manager opened');

    if (this.identityManager.identity) {
      log('joining network...');
      await this.identityManager.identity.joinNetwork(ctx);
      log('network joined');

      log('initializing spaces...(calling _initialize)');
      await this._initialize(ctx);
      log('spaces initialized');
    } else {
      log('no identity, skipping network join and space initialization');
    }

    log('opening feed syncer...');
    await this._feedSyncer?.open(ctx);
    log('feed syncer opened');

    log('loading persistent invitations...');
    const loadedInvitations = await this.invitationsManager.loadPersistentInvitations(ctx);
    log('loaded persistent invitations', { count: loadedInvitations.invitations?.length });

    log('opened');
  }

  protected override async _close(ctx: Context): Promise<void> {
    log('closing...');

    await this._feedSyncer?.close();

    await this._deviceSpaceSync?.close?.();
    await this.dataSpaceManager?.close(ctx);
    await this.edgeAgentManager?.close();
    await this.identityManager.close(ctx);
    await this.spaceManager.close();
    await this.echoHost.close(ctx);

    await this.networkManager.close(ctx);
    await this.signalManager.close();
    await this._edgeConnection?.close();
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
    const factory = this._handlerFactories.get(invitation.kind);
    invariant(factory, `Unknown invitation kind: ${invitation.kind}`);
    return factory(invitation);
  }

  async broadcastProfileUpdate(profile: ProfileDocument | undefined): Promise<void> {
    if (!profile || !this.dataSpaceManager) {
      return;
    }

    for (const space of this.dataSpaceManager.spaces.values()) {
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

  // Called when identity is created.
  @Trace.span()
  private async _initialize(ctx: Context): Promise<void> {
    log('_initialize: start');
    const identity = this.identityManager.identity ?? failUndefined();
    const signingContextProvider = createSigningContextProvider(() => this.identityManager.identity ?? failUndefined());

    log('_initialize: creating DataSpaceManager');
    this.dataSpaceManager = new DataSpaceManager({
      spaceManager: this.spaceManager,
      metadataStore: this.metadataStore,
      keyring: this.keyring,
      signingContextProvider,
      feedStore: this.feedStore,
      echoHost: this.echoHost,
      invitationsManager: this.invitationsManager,
      edgeConnection: this._edgeConnection,
      edgeHttpClient: this._edgeHttpClient,
      echoEdgeReplicator: this._echoEdgeReplicator,
      meshReplicator: this._meshReplicator,
      runtimeProps: this._runtimeProps as DataSpaceManagerRuntimeProps,
      edgeFeatures: this._edgeFeatures,
    });
    log('_initialize: opening DataSpaceManager...');
    await this.dataSpaceManager.open(ctx);
    log('_initialize: DataSpaceManager opened');

    this.edgeAgentManager = new EdgeAgentManager(
      this._edgeFeatures,
      this._edgeHttpClient,
      this.dataSpaceManager,
      identityProviderFromManager(this.identityManager),
    );
    log('_initialize: opening EdgeAgentManager...');
    await this.edgeAgentManager.open(ctx);
    log('_initialize: EdgeAgentManager opened');

    this._handlerFactories.set(Invitation.Kind.SPACE, (invitation) => {
      invariant(this.dataSpaceManager, 'dataSpaceManager not initialized yet');
      return new SpaceInvitationProtocol(
        this.dataSpaceManager,
        signingContextProvider(),
        this.keyring,
        invitation.spaceKey,
      );
    });
    this.initialized.wake();
    log('_initialize: initialized.wake() called');

    this._deviceSpaceSync = createCrossDeviceSpaceSynchronizer(this.dataSpaceManager);
    this._deviceSpaceSync.setIdentity(identity);
    await this._deviceSpaceSync?.open?.(ctx);
  }

  private async _setNetworkIdentity(params?: { deviceCredential?: Credential; identity?: Identity }): Promise<void> {
    log('_setNetworkIdentity: acquiring mutex...');
    using _ = await this._edgeIdentityUpdateMutex.acquire();
    log('_setNetworkIdentity: mutex acquired');

    let edgeIdentity: EdgeIdentity;
    const identity = params?.identity;
    if (identity) {
      log('_setNetworkIdentity: has identity', {
        identity: identity.identityKey.toHex(),
        hasDeviceCredential: !!params?.deviceCredential,
      });

      if (params?.deviceCredential) {
        log('_setNetworkIdentity: creating chain edge identity with device credential...');
        edgeIdentity = await createChainEdgeIdentity(
          identity.signer,
          identity.identityKey,
          identity.deviceKey,
          { credential: params.deviceCredential },
          [], // TODO(dmaretskyi): Service access credentials.
        );
        log('_setNetworkIdentity: chain edge identity created');
      } else {
        log('_setNetworkIdentity: waiting for identity.ready()...');
        // TODO: throw here or from identity if device chain can't be loaded, to avoid indefinite hangup
        await warnAfterTimeout(10_000, 'Waiting for identity to be ready for edge connection', async () => {
          await identity.ready();
        });
        log('_setNetworkIdentity: identity.ready() resolved', {
          hasDeviceCredentialChain: !!identity.deviceCredentialChain,
        });

        invariant(identity.deviceCredentialChain);

        log('_setNetworkIdentity: creating chain edge identity...');
        edgeIdentity = await createChainEdgeIdentity(
          identity.signer,
          identity.identityKey,
          identity.deviceKey,
          identity.deviceCredentialChain,
          [], // TODO(dmaretskyi): Service access credentials.
        );
        log('_setNetworkIdentity: chain edge identity created');
      }
    } else {
      log('_setNetworkIdentity: no identity, creating ephemeral edge identity...');
      edgeIdentity = await createEphemeralEdgeIdentity();
      log('_setNetworkIdentity: ephemeral edge identity created');
    }

    this._edgeConnection?.setIdentity(edgeIdentity);
    this._edgeHttpClient?.setIdentity(edgeIdentity);
    this.networkManager.setPeerInfo({
      identityDid: edgeIdentity.identityDid,
      peerKey: edgeIdentity.peerKey,
    });
    log('_setNetworkIdentity: done');
  }
}

export type ServiceContextLayerOptions = ServiceContextRuntimeProps & {
  edgeFeatures?: Runtime.Client.EdgeFeatures;
  getInvitationHandler: InvitationsManagerLayerOptions['getHandler'];
  echoHost?: EchoHostLayerOptions;
};

/**
 * Effect Layer composing dormant ServiceContext components constructed before identity is ready.
 */
export const ServiceContextLayer = (
  options: ServiceContextLayerOptions,
): Layer.Layer<
  | ServiceContextService
  | IMetadataStoreService
  | BlobStoreApiService
  | FeedStoreService
  | KeyringApiService
  | SpaceManagerService
  | IdentityManagerService
  | EdgeIdentityRecoveryManagerService
  | InvitationsHandlerService
  | InvitationsManagerService
  | EchoHostService,
  never,
  SwarmNetworkManagerService | EdgeConnectionService | EdgeHttpClientService | SqlClient.SqlClient | SqlTransactionTag
> => Layer.empty.pipe(
  Layer.provideMerge(Layer.unwrapEffect(Effect.gen(function *() {
    if(options.disableP2pReplication) {
      return MeshEchoReplicatorLayer()
    } else {
      return Layer.succeed(MeshEchoReplicatorLayer, undefined);
    }
  })))
  // TODO(dmaretskyi): Set invitation handlers.
  Layer.provideMerge(
    InvitationsManagerLayer({
      getHandler: () => todo()
    })
  )
  Layer.provideMerge(InvitationsHandlerLayer({
    connectionProps: options.invitationConnectionDefaultProps,
  })),
  Layer.provideMerge(echoHostLayer({
    useSubduction: options.useSubduction,
  })),
  Layer.provideMerge(
    EdgeIdentityRecoveryManagerLayer(),
  ),
  Layer.provideMerge(IdentityManagerLayer({
    devicePresenceOfflineTimeout: options.devicePresenceOfflineTimeout,
    devicePresenceAnnounceInterval: options.devicePresenceAnnounceInterval,
    edgeFeatures: options.edgeFeatures,
  })),
  Layer.provideMerge(SpaceManagerLayer({
    disableP2pReplication: options.disableP2pReplication
  }))
  Layer.provideMerge(storageLayer),
)

// setup was 3 stages
// 1. construct -- creates service shapes
// 2. open -- reads storag; assigns network identity and opens service + network
// 3. initialize -- happens on identity creation, opens spaces

const storageLayer: Layer.Layer<
  | BlobStoreApiService
  | FeedFactoryService
  | FeedStorageDirectoryService
  | FeedStoreService
  | IMetadataStoreService
  | KeyringApiService
  | SqliteStorageService,
  never,
  SqlClient.SqlClient | SqlTransaction.SqlTransaction
> = Layer.empty.pipe(
  Layer.provideMerge(FeedStoreLayer()),
  Layer.provideMerge(
    FeedFactoryLayer({
      hypercore: {
        valueEncoding,
        stats: true,
      },
    }),
  ),
  Layer.provideMerge(FeedStorageDirectoryLayer()),
  Layer.provideMerge(SqliteMetadataStoreLayer()),
  Layer.provideMerge(SqliteBlobStoreLayer()),
  Layer.provideMerge(SqliteKeyringLayer()),
  Layer.provideMerge(SqliteStorageLayer()),
  Layer.provideMerge(SqliteKeyringLayer()),
);

const echoHostLayer = (options: Pick<EchoHostProps, 'useSubduction'>) =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const identityManager = yield* IdentityManagerService;
      const spaceManager = yield* SpaceManagerService;
      const feedSyncer = yield* FeedSyncerService;
      return EchoHostLayer({
        peerIdProvider: () => identityManager.identity?.deviceKey?.toHex(),
        getSpaceKeyByRootDocumentId: (documentId) => spaceManager.findSpaceByRootDocumentId(documentId)?.key,
        useSubduction: options.useSubduction,
        syncFeed: async (ctx, request) => {
          return feedSyncer?.syncBlocking(ctx, {
            spaceId: request.spaceId as SpaceId,
            subspaceTag: request.subspaceTag,
            shouldPush: request.shouldPush,
            shouldPull: request.shouldPull,
          });
        },
        getSyncState: async (ctx, request) => {
          // Mirror `syncFeed` above: in non-edge / partially-initialised modes the
          // feed syncer is absent. Return an empty state instead of throwing so
          // callers (e.g. devtools sync panel) keep working.
          if (!feedSyncer) {
            return { namespaces: [] };
          }
          return feedSyncer.getSyncState(ctx, request);
        },
      });
    }),
  );
