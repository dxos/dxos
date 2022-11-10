//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { CredentialSigner, CredentialGenerator } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { AdmittedFeed } from '@dxos/protocols/proto/dxos/halo/credentials';
import { ComplexMap } from '@dxos/util';

import { Database, DataServiceSubscriptions } from '../database';
import { MetadataStore } from '../metadata';
import { AuthProvider, AuthVerifier } from './auth-plugin';
import { Space } from './space';
import { SpaceProtocol } from './space-protocol';

// TODO(burdon): ???
export interface AcceptSpaceOptions {
  spaceKey: PublicKey;
  genesisFeedKey: PublicKey;
}

// TODO(burdon): Factor out to CredentialGenerator?
export interface SigningContext {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  credentialProvider: AuthProvider;
  credentialAuthenticator: AuthVerifier;
  credentialSigner: CredentialSigner; // TODO(burdon): Already has keyring.
}

export type SpaceManagerParams = {
  metadataStore: MetadataStore;
  feedStore: FeedStore<FeedMessage>;
  networkManager: NetworkManager;
  keyring: Keyring;
  dataServiceSubscriptions: DataServiceSubscriptions;
  modelFactory: ModelFactory;
  signingContext: SigningContext;
};

/**
 * Manages a collection of ECHO (Data) Spaces.
 */
export class SpaceManager {
  public readonly updated = new Event();

  private readonly _spaces = new ComplexMap<PublicKey, Space>(PublicKey.hash);
  private readonly _metadataStore: MetadataStore;
  private readonly _feedStore: FeedStore<FeedMessage>;
  private readonly _networkManager: NetworkManager;
  private readonly _keyring: Keyring;
  private readonly _dataServiceSubscriptions: DataServiceSubscriptions;
  private readonly _modelFactory: ModelFactory;
  private readonly _signingContext: SigningContext; // TODO(burdon): Contains keyring.

  constructor({
    metadataStore,
    feedStore,
    networkManager,
    keyring,
    dataServiceSubscriptions,
    modelFactory,
    signingContext
  }: SpaceManagerParams) {
    // TODO(burdon): Assert.
    this._metadataStore = metadataStore;
    this._feedStore = feedStore;
    this._networkManager = networkManager;
    this._keyring = keyring;
    this._dataServiceSubscriptions = dataServiceSubscriptions;
    this._modelFactory = modelFactory;
    this._signingContext = signingContext;
  }

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  async open() {
    await this._metadataStore.load();

    for (const spaceMetadata of this._metadataStore.parties) {
      const space = await this._constructSpace(spaceMetadata);
      await space.open();
      this._dataServiceSubscriptions.registerSpace(space.key, space.database!.createDataServiceHost());
      this._spaces.set(spaceMetadata.key, space);
    }
  }

  async close() {
    await Promise.all([...this._spaces.values()].map((space) => space.close()));
  }

  /**
   * Creates a new space writing the genesis credentials to the control feed.
   */
  async createSpace() {
    // TODO(burdon): Extract into genensis workflow/factory.
    // TODO(burdon): Re-use with Halo space construction.
    const spaceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();
    const metadata: SpaceMetadata = {
      key: spaceKey,
      genesisFeedKey: controlFeedKey,
      controlFeedKey,
      dataFeedKey
    };

    log('creating space...', { spaceKey });
    const space = await this._constructSpace(metadata);
    await space.open();

    // Write genesis credentials.
    {
      const generator = new CredentialGenerator(
        this._keyring,
        this._signingContext.identityKey,
        this._signingContext.deviceKey
      );

      const credentials = [
        ...(await generator.createSpaceGenesis(spaceKey, controlFeedKey)),
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
  async acceptSpace(opts: AcceptSpaceOptions): Promise<Space> {
    const metadata: SpaceMetadata = {
      key: opts.spaceKey,
      genesisFeedKey: opts.genesisFeedKey,
      controlFeedKey: await this._keyring.createKey(),
      dataFeedKey: await this._keyring.createKey()
    };

    log('accepting space...', { spaceKey: opts.spaceKey });
    const space = await this._constructSpace(metadata);
    await space.open();

    await this._metadataStore.addSpace(metadata);
    this._insertSpace(space);
    return space;
  }

  private _insertSpace(space: Space) {
    this._dataServiceSubscriptions.registerSpace(space.key, space.database!.createDataServiceHost());
    this._spaces.set(space.key, space);
    this.updated.emit();
  }

  private async _constructSpace(metadata: SpaceMetadata) {
    log('constructing space...', { spaceKey: metadata.genesisFeedKey });

    const controlFeed = await this._feedStore.openFeed(metadata.controlFeedKey ?? failUndefined(), { writable: true });
    const dataFeed = await this._feedStore.openFeed(metadata.dataFeedKey ?? failUndefined(), { writable: true });

    // The genesis feed will be the same as the control feed if the space was created by the local agent.
    const genesisFeed = await this._feedStore.openFeed(metadata.genesisFeedKey ?? failUndefined());

    const spaceKey = metadata.key;
    const protocol = new SpaceProtocol({
      topic: spaceKey,
      identity: {
        peerKey: this._signingContext.deviceKey,
        credentialProvider: this._signingContext.credentialProvider,
        credentialAuthenticator: this._signingContext.credentialAuthenticator
      },
      networkManager: this._networkManager
    });

    return new Space({
      spaceKey,
      protocol,
      genesisFeed,
      controlFeed,
      dataFeed,
      feedProvider: (feedKey) => this._feedStore.openFeed(feedKey),
      databaseFactory: async ({ databaseBackend }) =>
        new Database(this._modelFactory, databaseBackend, this._signingContext.identityKey)
    });
  }
}
