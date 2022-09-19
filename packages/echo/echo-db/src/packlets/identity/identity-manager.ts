//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { FeedStore } from '@dxos/feed-store';
import { AdmittedFeed, CredentialGenerator, IdentityRecord, SpaceRecord } from '@dxos/halo-protocol';
import { Keyring } from '@dxos/keyring';
import { NetworkManager, Plugin } from '@dxos/network-manager';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { log } from '@dxos/log';

import { MetadataStore } from '../metadata';
import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER, Space, SwarmIdentity } from '../space';
import { Identity } from './identity';

interface ConstructSpaceParams {
  spaceRecord: SpaceRecord
  swarmIdentity: SwarmIdentity
  networkPlugins: Plugin[]
}

export type JoinIdentityParams = {
  identityKey: PublicKey
  haloSpaceKey: PublicKey
  haloGenesisFeedKey: PublicKey
}

export class IdentityManager {
  private _identity?: Identity;

  constructor (
    private readonly _metadataStore: MetadataStore,
    private readonly _keyring: Keyring,
    private readonly _feedStore: FeedStore,
    private readonly _networkManager: NetworkManager
  ) {}

  get identity () {
    return this._identity;
  }

  async open () {
    await this._metadataStore.load();

    const identityRecord = this._metadataStore.getIdentityRecord();
    if (identityRecord) {
      this._identity = await this._constructIdentity(identityRecord);
      await this._identity.open();
      await this._identity.ready();
    }
  }

  async close () {
    await this._identity?.close();
  }

  private async _constructIdentity (identityRecord: IdentityRecord) {
    assert(!this._identity);

    log('Constructing identity', { identityRecord });

    const space = await this._constructSpace({
      spaceRecord: identityRecord.haloSpace,
      swarmIdentity: {
        peerKey: identityRecord.deviceKey,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      networkPlugins: []
    });

    return new Identity({
      identityKey: identityRecord.identityKey,
      deviceKey: identityRecord.deviceKey,
      signer: this._keyring,
      space
    });
  }

  private async _constructSpace ({ spaceRecord, swarmIdentity, networkPlugins }: ConstructSpaceParams) {

    const controlFeed = await this._feedStore.openReadWriteFeedWithSigner(spaceRecord.writeControlFeedKey, this._keyring);
    const dataFeed = await this._feedStore.openReadWriteFeedWithSigner(spaceRecord.writeDataFeedKey, this._keyring);

    // Might be the same feed as the control feed on the top.
    // It's important to initialize it after writable feeds so that the feed is in the writable state.
    const genesisFeed = await this._feedStore.openReadOnlyFeed(spaceRecord.genesisFeedKey);

    return new Space({
      spaceKey: spaceRecord.spaceKey,
      genesisFeed,
      controlFeed,
      dataFeed,
      // TODO(dmaretskyi): This might always be the empty timeframe.
      initialTimeframe: new Timeframe(),
      feedProvider: key => this._feedStore.openReadOnlyFeed(key),
      networkManager: this._networkManager,
      networkPlugins,
      swarmIdentity
    });
  }

  async createIdentity () {
    assert(!this._identity, 'Identity already exists.');

    const controlFeedKey = await this._keyring.createKey();

    const identityRecord: IdentityRecord = {
      identityKey: await this._keyring.createKey(),
      deviceKey: await this._keyring.createKey(),
      haloSpace: {
        spaceKey: await this._keyring.createKey(),
        genesisFeedKey: controlFeedKey,
        writeControlFeedKey: controlFeedKey,
        writeDataFeedKey: await this._keyring.createKey()
      }
    };
    const identity = await this._constructIdentity(identityRecord);
    await identity.open();

    {
      const generator = new CredentialGenerator(this._keyring, identityRecord.identityKey, identityRecord.deviceKey);
      const credentials = [
        ...await generator.createSpaceGenesis(identityRecord.haloSpace.spaceKey, identityRecord.haloSpace.genesisFeedKey),
        await generator.createFeedAdmission(identityRecord.haloSpace.spaceKey, identityRecord.haloSpace.writeDataFeedKey, AdmittedFeed.Designation.DATA),

        // Write device chain
        await generator.createDeviceAuthorization(identityRecord.deviceKey)
      ];

      for (const credential of credentials) {
        await identity.controlPipeline.writer.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }
    }

    // await this._keyring.deleteKey(identityRecord.identityKey);
    // await this._keyring.deleteKey(identityRecord.haloSpace.spaceKey);

    await this._metadataStore.setIdentityRecord(identityRecord);
    this._identity = identity;
    await this._identity.ready();
    return identity;
  }

  async joinIdentity(params: JoinIdentityParams) {
    assert(!this._identity, 'Identity already exists.');

    const controlFeedKey = await this._keyring.createKey();

    const identityRecord: IdentityRecord = {
      identityKey: await this._keyring.createKey(),
      deviceKey: await this._keyring.createKey(),
      haloSpace: {
        spaceKey: await this._keyring.createKey(),
        genesisFeedKey: controlFeedKey,
        writeControlFeedKey: controlFeedKey,
        writeDataFeedKey: await this._keyring.createKey()
      }
    };
    const identity = await this._constructIdentity(identityRecord);
    await identity.open();
  }
}
