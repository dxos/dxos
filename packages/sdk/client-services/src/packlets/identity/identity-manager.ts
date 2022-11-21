//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { CredentialGenerator } from '@dxos/credentials';
import {
  MOCK_AUTH_PROVIDER,
  MOCK_AUTH_VERIFIER,
  MetadataStore,
  Space,
  SwarmIdentity,
  Database,
  SpaceProtocol
} from '@dxos/echo-db';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager, Plugin } from '@dxos/network-manager';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { AdmittedFeed, IdentityRecord, SpaceRecord } from '@dxos/protocols/proto/dxos/halo/credentials';

import { Identity } from '../identity';

interface ConstructSpaceParams {
  spaceRecord: SpaceRecord;
  swarmIdentity: SwarmIdentity;
  networkPlugins?: Plugin[];
}

export type JoinIdentityParams = {
  identityKey: PublicKey;
  haloSpaceKey: PublicKey;
  haloGenesisFeedKey: PublicKey;
};

export type CreateIdentityOptions = {
  displayName?: string;
};

// TODO(dmaretskyi): Rename: represents the peer's state machine.
export class IdentityManager {
  readonly stateUpdate = new Event();

  private _identity?: Identity;

  // TODO(burdon): IdentityManagerParams.
  // TODO(dmaretskyi): Perhaps this should take/generate the peerKey outside of an initialized identity.
  constructor(
    private readonly _metadataStore: MetadataStore,
    private readonly _feedStore: FeedStore<FeedMessage>,
    private readonly _keyring: Keyring,
    private readonly _networkManager: NetworkManager,
    private readonly _modelFactory: ModelFactory
  ) {}

  get identity() {
    return this._identity;
  }

  async open() {
    await this._metadataStore.load();

    const identityRecord = this._metadataStore.getIdentityRecord();
    if (identityRecord) {
      this._identity = await this._constructIdentity(identityRecord);
      await this._identity.open();
      await this._identity.ready();
      this.stateUpdate.emit();
    }
  }

  async close() {
    await this._identity?.close();
  }

  async createIdentity({ displayName }: CreateIdentityOptions = {}) {
    assert(!this._identity, 'Identity already exists.');
    log('creating identity...');

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
          identityRecord.haloSpace.spaceKey,
          identityRecord.haloSpace.genesisFeedKey
        )),

        // Feed admission.
        await generator.createFeedAdmission(
          identityRecord.haloSpace.spaceKey,
          identityRecord.haloSpace.writeDataFeedKey,
          AdmittedFeed.Designation.DATA
        )
      ];

      if (displayName) {
        credentials.push(await generator.createProfileCredential({ displayName }));
      }

      // Device authorization (writes device chain).
      // NOTE: This credential is written last. This is a hack to make sure that display name is set before identity is "ready".
      credentials.push(await generator.createDeviceAuthorization(identityRecord.deviceKey));

      for (const credential of credentials) {
        await identity.controlPipeline.writer.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }
    }

    // TODO(burdon): ???
    // await this._keyring.deleteKey(identityRecord.identity_key);
    // await this._keyring.deleteKey(identityRecord.halo_space.space_key);

    await this._metadataStore.setIdentityRecord(identityRecord);
    this._identity = identity;
    await this._identity.ready();
    this.stateUpdate.emit();

    log('created identity', { identityKey: identity.identityKey, deviceKey: identity.deviceKey });
    return identity;
  }

  /**
   * Accept an existing identity. Expects it's device key to be authorized.
   */
  async acceptIdentity(params: JoinIdentityParams) {
    log('accepting identity', { params });
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

  private async _constructIdentity(identityRecord: IdentityRecord) {
    assert(!this._identity);
    log('constructing identity', { identityRecord });

    const space = await this._constructSpace({
      spaceRecord: identityRecord.haloSpace,
      swarmIdentity: {
        peerKey: identityRecord.deviceKey,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      }
    });

    log('done', { identityKey: identityRecord.identityKey });
    return new Identity({
      space,
      signer: this._keyring,
      identityKey: identityRecord.identityKey,
      deviceKey: identityRecord.deviceKey
    });
  }

  private async _constructSpace({ spaceRecord, swarmIdentity }: ConstructSpaceParams) {
    const controlFeed = await this._feedStore.openFeed(spaceRecord.writeControlFeedKey, { writable: true });
    const dataFeed = await this._feedStore.openFeed(spaceRecord.writeDataFeedKey, { writable: true });

    // The genesis feed will be the same as the control feed if the space was created by the local agent.
    // NOTE: Must be initialized after writable feeds so that it is in a writable state.
    const genesisFeed = await this._feedStore.openFeed(spaceRecord.genesisFeedKey);

    const protocol = new SpaceProtocol({
      topic: spaceRecord.spaceKey,
      identity: swarmIdentity,
      networkManager: this._networkManager
    });

    return new Space({
      spaceKey: spaceRecord.spaceKey,
      protocol,
      genesisFeed,
      controlFeed,
      dataFeed,
      feedProvider: (feedKey) => this._feedStore.openFeed(feedKey),
      databaseFactory: async ({ databaseBackend }) =>
        new Database(this._modelFactory, databaseBackend, swarmIdentity.peerKey)
    });
  }
}
