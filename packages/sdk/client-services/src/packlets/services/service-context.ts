//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { getCredentialAssertion, type CredentialProcessor } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { EchoHost } from '@dxos/echo-db';
import { MetadataStore, SnapshotStore, SpaceManager, valueEncoding } from '@dxos/echo-pipeline';
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
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type Credential, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type Storage } from '@dxos/random-access-storage';
import type { TeleportParams } from '@dxos/teleport';
import { BlobStore } from '@dxos/teleport-extension-object-sync';
import { trace as Trace } from '@dxos/tracing';
import { safeInstanceof } from '@dxos/util';

import {
  IdentityManager,
  type CreateIdentityOptions,
  type IdentityManagerRuntimeParams,
  type JoinIdentityParams,
} from '../identity';
import {
  DeviceInvitationProtocol,
  InvitationsHandler,
  InvitationsManager,
  SpaceInvitationProtocol,
  type InvitationProtocol,
} from '../invitations';
import { DataSpaceManager, type DataSpaceManagerRuntimeParams, type SigningContext } from '../spaces';

export type ServiceContextRuntimeParams = IdentityManagerRuntimeParams &
  DataSpaceManagerRuntimeParams & { invitationConnectionDefaultParams?: Partial<TeleportParams> };
/**
 * Shared backend for all client services.
 */
// TODO(burdon): Rename/break-up into smaller components. And/or make members private.
// TODO(dmaretskyi): Gets duplicated in CJS build between normal and testing bundles.
@safeInstanceof('dxos.client-services.ServiceContext')
@Trace.resource()
export class ServiceContext extends Resource {
  public readonly initialized = new Trigger();
  public readonly metadataStore: MetadataStore;
  /**
   * @deprecated
   */
  public readonly snapshotStore: SnapshotStore;
  public readonly blobStore: BlobStore;
  public readonly feedStore: FeedStore<FeedMessage>;
  public readonly keyring: Keyring;
  public readonly spaceManager: SpaceManager;
  public readonly identityManager: IdentityManager;
  public readonly invitations: InvitationsHandler;
  public readonly invitationsManager: InvitationsManager;
  public readonly echoHost: EchoHost;

  // Initialized after identity is initialized.
  public dataSpaceManager?: DataSpaceManager;

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
    public readonly _runtimeParams?: ServiceContextRuntimeParams,
  ) {
    super();

    // TODO(burdon): Move strings to constants.
    this.metadataStore = new MetadataStore(storage.createDirectory('metadata'));
    this.snapshotStore = new SnapshotStore(storage.createDirectory('snapshots'));
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
      snapshotStore: this.snapshotStore,
    });

    this.identityManager = new IdentityManager(
      this.metadataStore,
      this.keyring,
      this.feedStore,
      this.spaceManager,
      this._runtimeParams as IdentityManagerRuntimeParams,
    );

    this.echoHost = new EchoHost({ kv: this.level });

    this.invitations = new InvitationsHandler(this.networkManager, _runtimeParams?.invitationConnectionDefaultParams);
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
  }

  @Trace.span()
  protected override async _open(ctx: Context) {
    await this._checkStorageVersion();

    log('opening...');
    log.trace('dxos.sdk.service-context.open', trace.begin({ id: this._instanceId }));
    await this.signalManager.open();
    await this.networkManager.open();

    await this.echoHost.open(ctx);
    await this.metadataStore.load();
    await this.spaceManager.open();
    await this.identityManager.open(ctx);
    if (this.identityManager.identity) {
      await this._initialize(ctx);
    }

    const loadedInvitations = await this.invitationsManager.loadPersistentInvitations();
    log('loaded persistent invitations', { count: loadedInvitations.invitations?.length });

    log.trace('dxos.sdk.service-context.open', trace.end({ id: this._instanceId }));
    log('opened');
  }

  protected override async _close(ctx: Context) {
    log('closing...');
    if (this._deviceSpaceSync && this.identityManager.identity) {
      await this.identityManager.identity.space.spaceState.removeCredentialProcessor(this._deviceSpaceSync);
    }
    await this.dataSpaceManager?.close();
    await this.identityManager.close();
    await this.spaceManager.close();
    await this.feedStore.close();
    await this.metadataStore.close();
    await this.echoHost.close(ctx);
    await this.networkManager.close();
    await this.signalManager.close();
    log('closed');
  }

  async createIdentity(params: CreateIdentityOptions = {}) {
    const identity = await this.identityManager.createIdentity(params);
    await this._initialize(new Context());
    return identity;
  }

  getInvitationHandler(invitation: Partial<Invitation> & Pick<Invitation, 'kind'>): InvitationProtocol {
    const factory = this._handlerFactories.get(invitation.kind);
    invariant(factory, `Unknown invitation kind: ${invitation.kind}`);
    return factory(invitation);
  }

  async broadcastProfileUpdate(profile: ProfileDocument | undefined) {
    if (!profile || !this.dataSpaceManager) {
      return;
    }

    for (const space of this.dataSpaceManager.spaces.values()) {
      await space.updateOwnProfile(profile);
    }
  }

  private async _acceptIdentity(params: JoinIdentityParams) {
    const identity = await this.identityManager.acceptIdentity(params);
    await this._initialize(new Context());
    return identity;
  }

  private async _checkStorageVersion() {
    await this.metadataStore.load();
    if (this.metadataStore.version !== STORAGE_VERSION) {
      throw new InvalidStorageVersionError(STORAGE_VERSION, this.metadataStore.version);
      // TODO(mykola): Migrate storage to a new version if incompatibility is detected.
    }
  }

  // Called when identity is created.
  @Trace.span()
  private async _initialize(ctx: Context) {
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

    this.dataSpaceManager = new DataSpaceManager(
      this.spaceManager,
      this.metadataStore,
      this.keyring,
      signingContext,
      this.feedStore,
      this.echoHost,
      this.invitationsManager,
      this._runtimeParams as DataSpaceManagerRuntimeParams,
    );
    await this.dataSpaceManager.open();

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
}
