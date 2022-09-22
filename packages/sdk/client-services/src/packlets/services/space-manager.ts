//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { failUndefined, raise } from '@dxos/debug';
import { DataService, MetadataStore, MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER, Space } from '@dxos/echo-db';
import { FeedStore } from '@dxos/feed-store';
import { CredentialGenerator, CredentialSigner } from '@dxos/halo-protocol';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { NetworkManager } from '@dxos/network-manager';
import { Timeframe } from '@dxos/protocols';
import { PartyMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { AdmittedFeed } from '@dxos/protocols/proto/dxos/halo/credentials';
import { ComplexMap } from '@dxos/util';

import { DataInvitations, InvitationDescriptor } from '../invitations';

// TODO(burdon): Move to @dxos/echo-db?

// TODO(burdon): ???
export interface SigningContext {
  credentialSigner: CredentialSigner
  identityKey: PublicKey
  deviceKey: PublicKey
}

// TODO(burdon): ???
export interface AcceptSpaceOptions {
  spaceKey: PublicKey
  genesisFeedKey: PublicKey
}

// TODO(burdon): ???
export class SpaceManager {
  public readonly spaces = new ComplexMap<PublicKey, Space>(PublicKey.hash);
  public readonly update = new Event();

  private readonly _invitations: DataInvitations;

  constructor (
    private readonly _metadataStore: MetadataStore,
    private readonly _keyring: Keyring,
    private readonly _feedStore: FeedStore,
    private readonly _networkManager: NetworkManager,
    private readonly _signingContext: SigningContext,
    private readonly _dataService: DataService
  ) {
    this._invitations = new DataInvitations(
      this._networkManager,
      this._signingContext,
      this // TODO(burdon): ???
    );
  }

  async open () {
    await this._metadataStore.load();

    for (const spaceMetadata of this._metadataStore.parties) {
      const space = await this._constructSpace(spaceMetadata);
      await space.open();
      this._dataService.trackParty(space.key, space.database!.createDataServiceHost());
      this.spaces.set(spaceMetadata.key, space);
    }
  }

  async close () {
    await Promise.all([...this.spaces.values()].map(space => space.close()));
  }

  private async _constructSpace (metadata: PartyMetadata) {
    const controlFeed = await this._feedStore.openReadWriteFeedWithSigner(metadata.controlFeedKey ?? failUndefined(), this._keyring);
    const dataFeed = await this._feedStore.openReadWriteFeedWithSigner(metadata.dataFeedKey ?? failUndefined(), this._keyring);

    // Might be the same as controlFeed above, in case this space was created by the current agent.
    const genesisFeed = await this._feedStore.openReadOnlyFeed(metadata.genesisFeedKey ?? failUndefined());

    return new Space({
      controlFeed,
      dataFeed,
      genesisFeed,
      feedProvider: key => this._feedStore.openReadOnlyFeed(key),
      spaceKey: metadata.key,
      networkManager: this._networkManager,
      initialTimeframe: new Timeframe(),
      networkPlugins: [],
      swarmIdentity: {
        peerKey: this._signingContext.deviceKey,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      }
    });
  }

  async createSpace () {
    const spaceKey = await this._keyring.createKey();

    const controlFeed = await this._feedStore.openReadWriteFeedWithSigner(await this._keyring.createKey(), this._keyring);
    const dataFeed = await this._feedStore.openReadWriteFeedWithSigner(await this._keyring.createKey(), this._keyring);

    const metadata: PartyMetadata = {
      key: spaceKey,
      controlFeedKey: controlFeed.key,
      dataFeedKey: dataFeed.key,
      genesisFeedKey: controlFeed.key
    };
    const space = await this._constructSpace(metadata);
    await space.open();

    // Write genesis credentials.
    {
      const generator = new CredentialGenerator(this._keyring, this._signingContext.identityKey, this._signingContext.deviceKey);
      const credentials = [
        ...await generator.createSpaceGenesis(spaceKey, controlFeed.key),
        await generator.createFeedAdmission(spaceKey, dataFeed.key, AdmittedFeed.Designation.DATA)
      ];

      for (const credential of credentials) {
        await space.controlPipeline.writer.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }
    }

    await this._metadataStore.addSpace(metadata);
    this._dataService.trackParty(space.key, space.database!.createDataServiceHost());
    this.spaces.set(spaceKey, space);
    this.update.emit();
    return space;
  }

  async acceptSpace (opts: AcceptSpaceOptions): Promise<Space> {
    const space = await this._constructSpace({
      key: opts.spaceKey,
      genesisFeedKey: opts.genesisFeedKey,
      controlFeedKey: await this._keyring.createKey(),
      dataFeedKey: await this._keyring.createKey()
    });

    await space.open();
    this._dataService.trackParty(space.key, space.database!.createDataServiceHost());
    this.spaces.set(space.key, space);
    this.update.emit();

    return space;
  }

  async joinSpace (invitationDescriptor: InvitationDescriptor) {
    return this._invitations.acceptInvitation(invitationDescriptor);
  }

  async createInvitation (spaceKey: PublicKey, onFinish?: () => void) {
    const space = this.spaces.get(spaceKey) ?? raise(new Error('Space not found.'));

    return this._invitations.createInvitation(space, { onFinish });
  }
}
