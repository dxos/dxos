//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { FeedStore } from '@dxos/feed-store';
import { CredentialGenerator, CredentialSigner } from '@dxos/halo-protocol';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { NetworkManager } from '@dxos/network-manager';
import { Timeframe } from '@dxos/protocols';
import { PartyMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { AdmittedFeed } from '@dxos/protocols/proto/dxos/halo/credentials';
import { ComplexMap } from '@dxos/util';

import { DataService } from '../database';
import { MetadataStore } from '../metadata';
import { AuthProvider, AuthVerifier } from './auth-plugin';
import { Space } from './space';

// TODO(burdon): Factor out to CredentialGenerator?
export interface SigningContext {
  credentialProvider: AuthProvider
  credentialAuthenticator: AuthVerifier
  credentialSigner: CredentialSigner // TODO(burdon): Already has keyring.
  identityKey: PublicKey
  deviceKey: PublicKey
}

// TODO(burdon): ???
export interface AcceptSpaceOptions {
  spaceKey: PublicKey
  genesisFeedKey: PublicKey
}

/**
 * Manages a collection of ECHO (Data) Spaces.
 */
export class SpaceManager {
  public readonly spaces = new ComplexMap<PublicKey, Space>(PublicKey.hash);
  public readonly update = new Event();

  constructor (
    private readonly _metadataStore: MetadataStore,
    private readonly _feedStore: FeedStore,
    private readonly _networkManager: NetworkManager,
    private readonly _keyring: Keyring,
    private readonly _dataService: DataService,
    private readonly _signingContext: SigningContext // TODO(burdon): Contains keyring.
  ) {}

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

  /**
   * Creates a new space writing the genesis credentials to the control feed.
   */
  async createSpace () {
    // TODO(burdon): Extract into genensis workflow/factory.
    // TODO(burdon): Re-use with Halo space construction.
    const spaceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();
    const metadata: PartyMetadata = {
      key: spaceKey,
      genesisFeedKey: controlFeedKey,
      controlFeedKey,
      dataFeedKey
    };

    const space = await this._constructSpace(metadata);
    await space.open();

    // Write genesis credentials.
    {
      const generator = new CredentialGenerator(
        this._keyring, this._signingContext.identityKey, this._signingContext.deviceKey);

      const credentials = [
        ...await generator.createSpaceGenesis(spaceKey, controlFeedKey),
        await generator.createFeedAdmission(spaceKey, dataFeedKey, AdmittedFeed.Designation.DATA)
      ];

      for (const credential of credentials) {
        await space.controlPipeline.writer.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }
    }

    await this._metadataStore.addSpace(metadata);

    this._insertSpace(space);
    return space;
  }

  // TODO(burdon): Rename join space.
  async acceptSpace (opts: AcceptSpaceOptions): Promise<Space> {
    const space = await this._constructSpace({
      key: opts.spaceKey,
      genesisFeedKey: opts.genesisFeedKey,
      controlFeedKey: await this._keyring.createKey(),
      dataFeedKey: await this._keyring.createKey()
    });

    await space.open();

    this._insertSpace(space);
    return space;
  }

  private _insertSpace (space: Space) {
    this._dataService.trackParty(space.key, space.database!.createDataServiceHost());
    this.spaces.set(space.key, space);
    this.update.emit();
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
      swarmIdentity: { // TODO(burdon): Related to context object?
        peerKey: this._signingContext.deviceKey,
        credentialProvider: this._signingContext.credentialProvider,
        credentialAuthenticator: this._signingContext.credentialAuthenticator
      }
    });
  }
}
