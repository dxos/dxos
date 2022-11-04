//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import {
  MOCK_AUTH_PROVIDER,
  MOCK_AUTH_VERIFIER,
  valueEncoding,
  DataService,
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

import { IdentityManager } from '../identity';
import { HaloInvitations, SpaceInvitationsHandler } from '../invitations';

/**
 * Shared backend for all client services.
 */
// TODO(burdon): Rename/break-up into smaller components. And/or make members private.
export class ServiceContext {
  public readonly initialized = new Trigger();

  // TODO(burdon): Factor out with other services.
  public readonly dataService = new DataService();

  public readonly metadataStore: MetadataStore;
  public readonly feedStore: FeedStore<FeedMessage>;
  public readonly keyring: Keyring;
  public readonly identityManager: IdentityManager;
  public readonly haloInvitations: HaloInvitations;

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
    this.haloInvitations = new HaloInvitations(this.identityManager, this.networkManager, async () => {
      await this._initialize();
    });
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
    await this.networkManager.destroy(); // TODO(burdon): Close.
    log('closed');
  }

  async createIdentity() {
    const identity = await this.identityManager.createIdentity();
    this.dataService.trackParty(identity.haloSpaceKey, identity.haloDatabase.createDataServiceHost());
    await this._initialize();
    return identity;
  }

  private async _initialize() {
    const identity = this.identityManager.identity ?? failUndefined();
    const signingContext: SigningContext = {
      credentialProvider: MOCK_AUTH_PROVIDER,
      credentialAuthenticator: MOCK_AUTH_VERIFIER,
      credentialSigner: identity.getIdentityCredentialSigner(),
      identityKey: identity.identityKey,
      deviceKey: identity.deviceKey
    };

    // Create in constructor (avoid all of these private variables).
    const spaceManager = new SpaceManager({
      metadataStore: this.metadataStore,
      feedStore: this.feedStore,
      networkManager: this.networkManager,
      keyring: this.keyring,
      dataService: this.dataService,
      modelFactory: this.modelFactory,
      signingContext
    });

    await spaceManager.open();
    this.spaceManager = spaceManager;
    this.spaceInvitations = new SpaceInvitationsHandler(this.spaceManager, this.networkManager, signingContext);

    this.initialized.wake();
  }
}
