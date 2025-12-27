//
// Copyright 2022 DXOS.org
//

import { Mutex, Trigger } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { type CredentialProcessor, getCredentialAssertion } from '@dxos/credentials';
import { failUndefined, warnAfterTimeout } from '@dxos/debug';
import {
  EchoEdgeReplicator,
  EchoHost,
  MeshEchoReplicator,
  MetadataStore,
  SpaceManager,
  valueEncoding,
} from '@dxos/echo-pipeline';
import { createChainEdgeIdentity, createEphemeralEdgeIdentity } from '@dxos/edge-client';
import type { EdgeConnection, EdgeHttpClient, EdgeIdentity } from '@dxos/edge-client';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { type SignalManager } from '@dxos/messaging';
import { type SwarmNetworkManager } from '@dxos/network-manager';
import { InvalidStorageVersionError, STORAGE_VERSION, trace } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type Credential, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type Storage } from '@dxos/random-access-storage';
import { BlobStore } from '@dxos/teleport-extension-object-sync';
import { trace as Trace } from '@dxos/tracing';
import { safeInstanceof } from '@dxos/util';

import { EdgeAgentManager } from '../agents';
import {
  type CreateIdentityOptions,
  IdentityManager,
  type IdentityManagerProps,
  type JoinIdentityProps,
} from '../identity';
import { EdgeIdentityRecoveryManager } from '../identity/identity-recovery-manager';
import {
  DeviceInvitationProtocol,
  type InvitationConnectionProps,
  type InvitationProtocol,
  InvitationsHandler,
  InvitationsManager,
  SpaceInvitationProtocol,
} from '../invitations';
import { DataSpaceManager, type DataSpaceManagerRuntimeProps, type SigningContext } from '../spaces';

export type ServiceContextRuntimeProps = Pick<
  IdentityManagerProps,
  'devicePresenceOfflineTimeout' | 'devicePresenceAnnounceInterval'
> &
  DataSpaceManagerRuntimeProps & {
    invitationConnectionDefaultProps?: InvitationConnectionProps;
    disableP2pReplication?: boolean;
    enableVectorIndexing?: boolean;
  };
/**
 * Shared backend for all client services.
 */
// TODO(burdon): Rename/break-up into smaller components. And/or make members private.
// TODO(dmaretskyi): Gets duplicated in CJS build between normal and testing bundles.
@safeInstanceof('dxos.client-services.ServiceContext')
@Trace.resource()
export class ServiceContext extends Resource {
  private readonly _edgeIdentityUpdateMutex = new Mutex();

  public readonly initialized = new Trigger();
  public readonly metadataStore: MetadataStore;
  public readonly blobStore: BlobStore;
  public readonly feedStore: FeedStore<FeedMessage>;
  public readonly keyring: Keyring;
  public readonly spaceManager: SpaceManager;
  public readonly identityManager: IdentityManager;
  public readonly recoveryManager: EdgeIdentityRecoveryManager;
  public readonly invitations: InvitationsHandler;
  public readonly invitationsManager: InvitationsManager;
  public readonly echoHost: EchoHost;
  private readonly _meshReplicator?: MeshEchoReplicator = undefined;
  private readonly _echoEdgeReplicator?: EchoEdgeReplicator = undefined;

  // Initialized after identity is initialized.
  public dataSpaceManager?: DataSpaceManager;
  public edgeAgentManager?: EdgeAgentManager;

  private readonly _handlerFactories = new Map<
    Invitation.Kind,
    (invitation: Partial<Invitation>) => InvitationProtocol
  >();

  private _deviceSpaceSync?: CredentialProcessor;

  private readonly _instanceId = PublicKey.random().toHex();

  constructor(
    public readonly storage: Storage,
    public readonly level: LevelDB,
    public readonly networkManager: SwarmNetworkManager,
    public readonly signalManager: SignalManager,
    private readonly _edgeConnection: EdgeConnection | undefined,
    private readonly _edgeHttpClient: EdgeHttpClient | undefined,
    public readonly _runtimeProps?: ServiceContextRuntimeProps,
    private readonly _edgeFeatures?: Runtime.Client.EdgeFeatures,
  ) {
    super();

    log('runtimeProps', this._runtimeProps);
    log('edgeFeatures', this._edgeFeatures);

    // TODO(burdon): Move strings to constants.
    this.metadataStore = new MetadataStore(storage.createDirectory('metadata'));
    this.blobStore = new BlobStore(storage.createDirectory('blobs'));

    this.keyring = new Keyring(storage.createDirectory('keyring'));
    this.feedStore = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: storage.createDirectory('feeds'),
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
      this._acceptIdentity.bind(this),
    );

    this.echoHost = new EchoHost({
      kv: this.level,
      peerIdProvider: () => this.identityManager.identity?.deviceKey?.toHex(),
      getSpaceKeyByRootDocumentId: (documentId) => this.spaceManager.findSpaceByRootDocumentId(documentId)?.key,
      indexing: {
        vector: this._runtimeProps?.enableVectorIndexing,
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
    if (this._edgeConnection && this._edgeFeatures?.echoReplicator && this._edgeHttpClient) {
      this._echoEdgeReplicator = new EchoEdgeReplicator({
        edgeConnection: this._edgeConnection,
        edgeHttpClient: this._edgeHttpClient,
      });
    }
  }

  @Trace.span()
  protected override async _open(ctx: Context): Promise<void> {
    await this._checkStorageVersion();

    log('opening...');
    log.trace('dxos.sdk.service-context.open', trace.begin({ id: this._instanceId }));

    await this.identityManager.open(ctx);

    await this._setNetworkIdentity();

    await this._edgeConnection?.open();
    await this.signalManager.open();
    await this.networkManager.open();

    await this.echoHost.open(ctx);

    if (this._meshReplicator) {
      await this.echoHost.addReplicator(this._meshReplicator);
    }
    if (this._echoEdgeReplicator) {
      await this.echoHost.addReplicator(this._echoEdgeReplicator);
    }

    await this.metadataStore.load();
    await this.spaceManager.open();

    if (this.identityManager.identity) {
      await this.identityManager.identity.joinNetwork();
      await this._initialize(ctx);
    }

    const loadedInvitations = await this.invitationsManager.loadPersistentInvitations();
    log('loaded persistent invitations', { count: loadedInvitations.invitations?.length });

    log.trace('dxos.sdk.service-context.open', trace.end({ id: this._instanceId }));
    log('opened');
  }

  protected override async _close(ctx: Context): Promise<void> {
    log('closing...');
    if (this._deviceSpaceSync && this.identityManager.identity) {
      await this.identityManager.identity.space.spaceState.removeCredentialProcessor(this._deviceSpaceSync);
    }
    await this.dataSpaceManager?.close();
    await this.edgeAgentManager?.close();
    await this.identityManager.close();
    await this.spaceManager.close();
    await this.echoHost.close(ctx);

    await this.networkManager.close();
    await this.signalManager.close();
    await this._edgeConnection?.close();
    await this.feedStore.close();
    await this.metadataStore.close();

    log('closed');
  }

  async createIdentity(params: CreateIdentityOptions = {}) {
    const identity = await this.identityManager.createIdentity(params);
    await this._setNetworkIdentity();
    await identity.joinNetwork();
    await this._initialize(new Context());
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
    const { identity, identityRecord } = await this.identityManager.prepareIdentity(params);
    await this._setNetworkIdentity({ deviceCredential: params.authorizedDeviceCredential! });
    await identity.joinNetwork();
    await this.identityManager.acceptIdentity(identity, identityRecord, params.deviceProfile);
    await this._initialize(new Context());
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
    log('initializing spaces...');
    const identity = this.identityManager.identity ?? failUndefined();
    const signingContext: SigningContext = {
      credentialSigner: identity.getIdentityCredentialSigner(),
      identityKey: identity.identityKey,
      deviceKey: identity.deviceKey,
      getProfile: () => identity.profileDocument,
      recordCredential: async (credential) => {
        await identity.controlPipeline.writer.write({ credential: { credential } });
      },
    };

    this.dataSpaceManager = new DataSpaceManager({
      spaceManager: this.spaceManager,
      metadataStore: this.metadataStore,
      keyring: this.keyring,
      signingContext,
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
    await this.dataSpaceManager.open();

    this.edgeAgentManager = new EdgeAgentManager(
      this._edgeFeatures,
      this._edgeHttpClient,
      this.dataSpaceManager,
      identity,
    );
    await this.edgeAgentManager.open();

    this._handlerFactories.set(Invitation.Kind.SPACE, (invitation) => {
      invariant(this.dataSpaceManager, 'dataSpaceManager not initialized yet');
      return new SpaceInvitationProtocol(this.dataSpaceManager, signingContext, this.keyring, invitation.spaceKey);
    });
    this.initialized.wake();

    this._deviceSpaceSync = {
      processCredential: async (credential: Credential) => {
        const assertion = getCredentialAssertion(credential);
        if (assertion['@type'] !== 'dxos.halo.credentials.SpaceMember') {
          return;
        }
        if (assertion.spaceKey.equals(identity.space.key)) {
          // ignore halo space
          return;
        }
        if (!this.dataSpaceManager) {
          log('dataSpaceManager not initialized yet, ignoring space admission', { details: assertion });
          return;
        }
        if (this.dataSpaceManager.spaces.has(assertion.spaceKey)) {
          log('space already exists, ignoring space admission', { details: assertion });
          return;
        }

        try {
          log('accepting space recorded in halo', { details: assertion });
          await this.dataSpaceManager.acceptSpace({
            spaceKey: assertion.spaceKey,
            genesisFeedKey: assertion.genesisFeedKey,
          });
        } catch (err) {
          log.catch(err);
        }
      },
    };

    await identity.space.spaceState.addCredentialProcessor(this._deviceSpaceSync);
  }

  private async _setNetworkIdentity(params?: { deviceCredential: Credential }): Promise<void> {
    using _ = await this._edgeIdentityUpdateMutex.acquire();

    let edgeIdentity: EdgeIdentity;
    const identity = this.identityManager.identity;
    if (identity) {
      log('setting identity on edge connection', {
        identity: identity.identityKey.toHex(),
        swarms: this.networkManager.topics,
      });

      if (params?.deviceCredential) {
        edgeIdentity = await createChainEdgeIdentity(
          identity.signer,
          identity.identityKey,
          identity.deviceKey,
          params?.deviceCredential && { credential: params.deviceCredential },
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

    this._edgeConnection?.setIdentity(edgeIdentity);
    this._edgeHttpClient?.setIdentity(edgeIdentity);
    this.networkManager.setPeerInfo({
      identityKey: edgeIdentity.identityKey,
      peerKey: edgeIdentity.peerKey,
    });
  }
}
