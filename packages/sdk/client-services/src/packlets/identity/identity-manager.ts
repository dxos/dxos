//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { CredentialGenerator } from '@dxos/credentials';
import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER, MetadataStore, Space, SwarmIdentity, Database } from '@dxos/echo-db';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager, Plugin } from '@dxos/network-manager';
import { Timeframe } from '@dxos/protocols';
import { AdmittedFeed, IdentityRecord, SpaceRecord } from '@dxos/protocols/proto/dxos/halo/credentials';

import { Identity } from '../identity';

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

// TODO(dmaretskyi): Rename: represents the peer's state machine.
export class IdentityManager {
  readonly stateUpdate = new Event();

  private _identity?: Identity;

  // TODO(dmaretskyi): Perhaps this should take/generate the peerKey outside of an initialized identity.
  constructor (
    private readonly _metadataStore: MetadataStore,
    private readonly _feedStore: FeedStore,
    private readonly _keyring: Keyring,
    private readonly _networkManager: NetworkManager,
    private readonly _modelFactory: ModelFactory
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
      this.stateUpdate.emit();
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
      swarmIdentity,
      databaseFactory: async ({ databaseBackend }) => new Database(this._modelFactory, databaseBackend, swarmIdentity.peerKey)
    });
  }

  async createIdentity () {
    log('Create identity');
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
        // Space genesis.
        ...(await generator.createSpaceGenesis(
          identityRecord.haloSpace.spaceKey, identityRecord.haloSpace.genesisFeedKey)),

        // Feed admission.
        await generator.createFeedAdmission(
          identityRecord.haloSpace.spaceKey, identityRecord.haloSpace.writeDataFeedKey, AdmittedFeed.Designation.DATA),

        // Device authorization (writes device chain).
        await generator.createDeviceAuthorization(identityRecord.deviceKey)
      ];

      for (const credential of credentials) {
        await identity.controlPipeline.writer.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }
    }

    // await this._keyring.deleteKey(identityRecord.identity_key);
    // await this._keyring.deleteKey(identityRecord.halo_space.space_key);

    await this._metadataStore.setIdentityRecord(identityRecord);
    this._identity = identity;
    await this._identity.ready();
    this.stateUpdate.emit();
    return identity;
  }

  /**
   * Accept an existing identity. Expects it's device key to be authorized.
   */
  async acceptIdentity (params: JoinIdentityParams) {
    log('Accept identity', { params });
    assert(!this._identity, 'Identity already exists.');

    const identity = await this._constructIdentity({
      identityKey: params.identityKey,
      deviceKey: await this._keyring.createKey(),
      haloSpace: {
        spaceKey: params.haloSpaceKey,
        genesisFeedKey: params.haloGenesisFeedKey,
        writeControlFeedKey: await this._keyring.createKey(),
        writeDataFeedKey: await this._keyring.createKey()
      }
    });

    await identity.open();
    this._identity = identity;
    this.stateUpdate.emit();
    return identity;
  }
}
