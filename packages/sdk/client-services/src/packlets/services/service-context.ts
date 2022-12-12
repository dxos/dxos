//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import {
  MOCK_AUTH_PROVIDER,
  MOCK_AUTH_VERIFIER,
  valueEncoding,
  DataServiceSubscriptions,
  MetadataStore,
  SpaceManager,
  SigningContext
} from '@dxos/echo-db';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Storage } from '@dxos/random-access-storage';

import { CreateIdentityOptions, IdentityManager } from '../identity';
import { HaloInvitationsHandler, SpaceInvitationsHandler } from '../invitations';

/**
 * Shared backend for all client services.
 */

// TODO(burdon): Rename/break-up into smaller components. And/or make members private.
export class ServiceContext {
  public readonly initialized = new Trigger();
  public readonly dataServiceSubscriptions = new DataServiceSubscriptions();
  public readonly metadataStore: MetadataStore;
  public readonly feedStore: FeedStore<FeedMessage>;
  public readonly keyring: Keyring;
  public readonly identityManager: IdentityManager;
  public readonly haloInvitations: HaloInvitationsHandler;

  // Initialized after identity is initialized.
  public spaceManager?: SpaceManager;
  public spaceInvitations?: SpaceInvitationsHandler;

  // prettier-ignore
  constructor(
    public readonly storage: Storage,
    public readonly networkManager: NetworkManager,
    public readonly modelFactory: ModelFactory
  ) {
    // TODO(burdon): Move strings to constants.
    this.metadataStore = new MetadataStore(storage.createDirectory('metadata'));
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

    this.identityManager = new IdentityManager(
      this.metadataStore,
      this.feedStore,
      this.keyring,
      networkManager,
      modelFactory
    );

    // TODO(burdon): _initialize called in multiple places.
    // TODO(burdon): Call _initialize on success.
    this.haloInvitations = new HaloInvitationsHandler(this.networkManager, this.identityManager);
  }

  async open() {
    log('opening...');
    await this.identityManager.open();
    if (this.identityManager.identity) {
      await this._initialize();
    }
    log('opened');
  }

  async close() {
    log('closing...');
    await this.identityManager.close();
    await this.spaceManager?.close();
    await this.feedStore.close();
    await this.networkManager.close();
    this.dataServiceSubscriptions.clear();
    log('closed');
  }

  async reset() {
    log('resetting...');
    await this.close();
    await this.storage.reset();
    log('reset');
  }

  async createIdentity(params: CreateIdentityOptions = {}) {
    const identity = await this.identityManager.createIdentity(params);

    this.dataServiceSubscriptions.registerSpace(identity.haloSpaceKey, identity.haloDatabase.createDataServiceHost());
    await this._initialize();
    return identity;
  }

  // Called when identity is created.
  private async _initialize() {
    const identity = this.identityManager.identity ?? failUndefined();
    const signingContext: SigningContext = {
      credentialProvider: MOCK_AUTH_PROVIDER,
      credentialAuthenticator: MOCK_AUTH_VERIFIER,
      credentialSigner: identity.getIdentityCredentialSigner(),
      identityKey: identity.identityKey,
      deviceKey: identity.deviceKey,
      profile: identity.profileDocument
    };

    // Create in constructor (avoid all of these private variables).
    const spaceManager = new SpaceManager({
      metadataStore: this.metadataStore,
      feedStore: this.feedStore,
      networkManager: this.networkManager,
      keyring: this.keyring,
      dataServiceSubscriptions: this.dataServiceSubscriptions,
      modelFactory: this.modelFactory,
      signingContext
    });

    await spaceManager.open();
    this.spaceManager = spaceManager;
    this.spaceInvitations = new SpaceInvitationsHandler(
      this.networkManager,
      this.spaceManager,
      signingContext,
      this.keyring
    );
    this.initialized.wake();
  }
}
