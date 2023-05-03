//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { Invitation } from '@dxos/client';
import { CredentialConsumer, getCredentialAssertion } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import {
  valueEncoding,
  MetadataStore,
  SpaceManager,
  SigningContext,
  DataServiceSubscriptions,
  SnapshotStore
} from '@dxos/echo-pipeline';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { SignalManager } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { trace } from '@dxos/protocols';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Storage } from '@dxos/random-access-storage';

import { CreateIdentityOptions, IdentityManager, JoinIdentityParams } from '../identity';
import {
  DeviceInvitationProtocol,
  InvitationsHandler,
  InvitationProtocol,
  SpaceInvitationProtocol
} from '../invitations';
import { DataSpaceManager } from '../spaces';

/**
 * Shared backend for all client services.
 */
// TODO(burdon): Rename/break-up into smaller components. And/or make members private.
export class ServiceContext {
  public readonly initialized = new Trigger();
  public readonly dataServiceSubscriptions = new DataServiceSubscriptions();
  public readonly metadataStore: MetadataStore;
  public readonly snapshotStore: SnapshotStore;
  public readonly feedStore: FeedStore<FeedMessage>;
  public readonly keyring: Keyring;
  public readonly spaceManager: SpaceManager;
  public readonly identityManager: IdentityManager;
  public readonly invitations: InvitationsHandler;

  // Initialized after identity is initialized.
  public dataSpaceManager?: DataSpaceManager;

  private readonly _handlerFactories = new Map<
    Invitation.Kind,
    (invitation: Partial<Invitation>) => InvitationProtocol
  >();

  private _deviceSpaceSync?: CredentialConsumer<any>;

  private readonly _instanceId = PublicKey.random().toHex();

  // prettier-ignore
  constructor(
    public readonly storage: Storage,
    public readonly networkManager: NetworkManager,
    public readonly signalManager: SignalManager,
    public readonly modelFactory: ModelFactory
  ) {
    // TODO(burdon): Move strings to constants.
    this.metadataStore = new MetadataStore(storage.createDirectory('metadata'));
    this.snapshotStore = new SnapshotStore(storage.createDirectory('snapshots'));

    this.keyring = new Keyring(storage.createDirectory('keyring'));
    this.feedStore = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: storage.createDirectory('feeds'),
        signer: this.keyring,
        hypercore: {
          valueEncoding
        }
      })
    });

    this.spaceManager = new SpaceManager({
      feedStore: this.feedStore,
      networkManager: this.networkManager
    });

    this.identityManager = new IdentityManager(
      this.metadataStore,
      this.keyring,
      this.feedStore,
      this.spaceManager
    );

    this.invitations = new InvitationsHandler(this.networkManager);

    // TODO(burdon): _initialize called in multiple places.
    // TODO(burdon): Call _initialize on success.
    this._handlerFactories.set(
      Invitation.Kind.DEVICE,
      () =>
        new DeviceInvitationProtocol(
          this.keyring,
          () => this.identityManager.identity ?? failUndefined(),
          this._acceptIdentity.bind(this)
        )
    );
  }

  async open() {
    log.trace('dxos.sdk.service-context.open', trace.begin({ id: this._instanceId }));

    log('opening...');
    await this.signalManager.open();
    await this.networkManager.open();
    await this.spaceManager.open();
    await this.identityManager.open();
    if (this.identityManager.identity) {
      await this._initialize();
    }
    log('opened');
    log.trace('dxos.sdk.service-context.open', trace.end({ id: this._instanceId }));
  }

  async close() {
    log('closing...');
    await this._deviceSpaceSync?.close();
    await this.dataSpaceManager?.close();
    await this.identityManager.close();
    await this.spaceManager.close();
    await this.feedStore.close();
    await this.networkManager.close();
    await this.signalManager.close();
    this.dataServiceSubscriptions.clear();
    log('closed');
  }

  async createIdentity(params: CreateIdentityOptions = {}) {
    const identity = await this.identityManager.createIdentity(params);

    await this._initialize();
    return identity;
  }

  getInvitationHandler(invitation: Partial<Invitation> & Pick<Invitation, 'kind'>): InvitationProtocol {
    const factory = this._handlerFactories.get(invitation.kind);
    assert(factory, `Unknown invitation kind: ${invitation.kind}`);
    return factory(invitation);
  }

  private async _acceptIdentity(params: JoinIdentityParams) {
    const identity = await this.identityManager.acceptIdentity(params);

    await this._initialize();
    return identity;
  }

  // Called when identity is created.
  private async _initialize() {
    log('initializing spaces...');
    const identity = this.identityManager.identity ?? failUndefined();
    const signingContext: SigningContext = {
      credentialSigner: identity.getIdentityCredentialSigner(),
      identityKey: identity.identityKey,
      deviceKey: identity.deviceKey,
      profile: identity.profileDocument,
      recordCredential: async (credential) => {
        await identity.controlPipeline.writer.write({ credential: { credential } });
      }
    };

    this.dataSpaceManager = new DataSpaceManager(
      this.spaceManager,
      this.metadataStore,
      this.dataServiceSubscriptions,
      this.keyring,
      signingContext,
      this.modelFactory,
      this.feedStore,
      this.snapshotStore
    );
    await this.dataSpaceManager.open();

    this._handlerFactories.set(Invitation.Kind.SPACE, (invitation) => {
      assert(this.dataSpaceManager, 'dataSpaceManager not initialized yet');
      return new SpaceInvitationProtocol(this.dataSpaceManager, signingContext, this.keyring, invitation.spaceKey);
    });
    this.initialized.wake();

    this._deviceSpaceSync = identity.space.spaceState.registerProcessor({
      process: async (credential: Credential) => {
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
            genesisFeedKey: assertion.genesisFeedKey
          });
        } catch (err) {
          log.catch(err);
        }
      }
    });
    await this._deviceSpaceSync.open();
  }
}
