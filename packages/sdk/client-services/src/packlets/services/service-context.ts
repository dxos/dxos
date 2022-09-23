//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { failUndefined, raise } from '@dxos/debug';
import {
  MOCK_AUTH_PROVIDER,
  MOCK_AUTH_VERIFIER,
  codec,
  DataService,
  MetadataStore,
  SpaceManager, SigningContext
} from '@dxos/echo-db';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { NetworkManager } from '@dxos/network-manager';
import { Storage } from '@dxos/random-access-storage';

import { IdentityManager } from '../identity';
import { DataInvitations, HaloInvitations, InvitationDescriptor } from '../invitations';

/**
 *
 */
export class ServiceContext {
  // TODO(burdon): Remove public access.
  public readonly dataService = new DataService();
  public readonly initialized = new Trigger();

  public readonly metadataStore: MetadataStore;
  public readonly feedStore: FeedStore;
  public readonly keyring: Keyring;
  public readonly identityManager: IdentityManager;
  public readonly invitations: HaloInvitations; // TOOD(burdon): Move.

  // Initialized after identity is intitialized.
  public spaceManager?: SpaceManager;
  public dataInvitations?: DataInvitations; // TOOD(burdon): Move.

  constructor (
    public storage: Storage,
    public networkManager: NetworkManager
  ) {
    this.metadataStore = new MetadataStore(storage.createDirectory('metadata'));
    this.feedStore = new FeedStore(storage.createDirectory('feeds'), { valueEncoding: codec });
    this.keyring = new Keyring(storage.createDirectory('keyring'));
    this.identityManager = new IdentityManager(
      this.metadataStore,
      this.feedStore,
      this.keyring,
      networkManager
    );

    // TODO(burdon): Rename.
    this.invitations = new HaloInvitations(this.networkManager, this.identityManager, async () => {
      await this._initialize();
    });
  }

  async open () {
    await this.identityManager.open();
  }

  async close () {
    await this.identityManager.close();
  }

  // TODO(dmaretskyi): Rename to createIdentity.
  async create () {
    const identity = await this.identityManager.createIdentity();
    this.dataService.trackParty(identity.haloSpaceKey, identity.haloDatabase.createDataServiceHost());
    await this._initialize();
    return identity;
  }

  private async _initialize () {
    const identity = this.identityManager.identity ?? failUndefined();
    const signingContext: SigningContext = {
      credentialProvider: MOCK_AUTH_PROVIDER,
      credentialAuthenticator: MOCK_AUTH_VERIFIER,
      credentialSigner: identity.getIdentityCredentialSigner(),
      identityKey: identity.identityKey,
      deviceKey: identity.deviceKey
    };

    const spaceManager = new SpaceManager(
      this.metadataStore,
      this.feedStore,
      this.networkManager,
      this.keyring,
      this.dataService,
      signingContext
    );

    await spaceManager.open();

    this.spaceManager = spaceManager;
    this.dataInvitations = new DataInvitations(this.networkManager, this.spaceManager, signingContext);

    this.initialized.wake();
  }

  async createInvitation (spaceKey: PublicKey, onFinish?: () => void) {
    assert(this.spaceManager);
    assert(this.dataInvitations);

    const space = this.spaceManager.spaces.get(spaceKey) ?? raise(new Error('Space not found.'));
    return this.dataInvitations.createInvitation(space, { onFinish });
  }

  async joinSpace (invitationDescriptor: InvitationDescriptor) {
    assert(this.dataInvitations);

    return this.dataInvitations.acceptInvitation(invitationDescriptor);
  }
}
