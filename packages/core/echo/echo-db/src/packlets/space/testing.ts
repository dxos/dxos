//
// Copyright 2022 DXOS.org
//

import { createCredentialSignerWithKey } from '@dxos/credentials';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { WebsocketSignalManager, MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManager, Plugin } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { createStorage, Storage, StorageType } from '@dxos/random-access-storage';
import { ComplexMap } from '@dxos/util';

import { TestFeedBuilder } from '../common';
import { Database, DataServiceSubscriptions } from '../database';
import { MetadataStore } from '../metadata';
import { AuthProvider, AuthVerifier } from './auth-plugin';
import { Space } from './space';
import { SpaceManager } from './space-manager';
import { SpaceProtocol } from './space-protocol';

export type NetworkManagerProvider = () => NetworkManager;

export const MemoryNetworkManagerProvider =
  (signalContext: MemorySignalManagerContext): NetworkManagerProvider =>
  () =>
    new NetworkManager({
      signalManager: new MemorySignalManager(signalContext),
      transportFactory: MemoryTransportFactory
    });

export const WebsocketNetworkManagerProvider =
  (signalUrl: string): NetworkManagerProvider =>
  () =>
    new NetworkManager({
      signalManager: new WebsocketSignalManager([signalUrl]),
      transportFactory: createWebRTCTransportFactory()
    });

export const MOCK_AUTH_PROVIDER: AuthProvider = async (nonce: Uint8Array) => Buffer.from('mock');
export const MOCK_AUTH_VERIFIER: AuthVerifier = async (nonce: Uint8Array, credential: Uint8Array) => true;

export type TestAgentBuilderOptions = {
  storage?: Storage;
  networkManagerProvider?: NetworkManagerProvider;
};

/**
 * Factory for test agents.
 */
export class TestAgentBuilder {
  private readonly _agents = new ComplexMap<PublicKey, TestAgent>(PublicKey.hash);
  private readonly _storage: Storage;
  private readonly _networkManagerProvider: NetworkManagerProvider;

  constructor({ storage, networkManagerProvider }: TestAgentBuilderOptions = {}) {
    this._storage = storage ?? createStorage({ type: StorageType.RAM });
    this._networkManagerProvider =
      networkManagerProvider ?? MemoryNetworkManagerProvider(new MemorySignalManagerContext());
  }

  async close() {
    return Promise.all(this.agents.map((agent) => agent.close()));
  }

  get agents() {
    return Array.from(this._agents.values());
  }

  getAgent(deviceKey: PublicKey) {
    return this._agents.get(deviceKey);
  }

  async createPeer(): Promise<TestAgent> {
    // prettier-ignore
    const feedBuilder = new TestFeedBuilder()
      .setStorage(this._storage, `agent-${this._agents.size}`);

    const identityKey = await feedBuilder.keyring.createKey();
    const deviceKey = await feedBuilder.keyring.createKey();

    const agent = new TestAgent(this._networkManagerProvider, feedBuilder, identityKey, deviceKey);
    this._agents.set(deviceKey, agent);
    return agent;
  }
}

/**
 * Test agent that enables the creation and replication of multiple spaces.
 */
export class TestAgent {
  private readonly _spaces = new ComplexMap<PublicKey, Space>(PublicKey.hash);

  public readonly keyring: Keyring;
  public readonly feedStore: FeedStore<FeedMessage>;

  constructor(
    private readonly _networkManagerProvider: NetworkManagerProvider,
    private readonly _feedBuilder: TestFeedBuilder,
    public readonly identityKey: PublicKey,
    public readonly deviceKey: PublicKey
  ) {
    this.keyring = this._feedBuilder.keyring;
    this.feedStore = this._feedBuilder.createFeedStore();
  }

  async close() {
    return Promise.all(this.spaces.map((space) => space.close()));
  }

  get spaces() {
    return Array.from(this._spaces.values());
  }

  getSpace(spaceKey: PublicKey) {
    return this._spaces.get(spaceKey);
  }

  createSpaceManager() {
    return new SpaceManager({
      keyring: this._feedBuilder.keyring,
      feedStore: this._feedBuilder.createFeedStore(),
      metadataStore: new MetadataStore(this._feedBuilder.storage.createDirectory('metadata')),
      networkManager: this._networkManagerProvider(),
      dataServiceSubscriptions: new DataServiceSubscriptions(),
      modelFactory: new ModelFactory().registerModel(ObjectModel),
      signingContext: {
        // TODO(burdon): Util to convert to Identity in SpaceProtocol
        identityKey: this.identityKey,
        deviceKey: this.deviceKey,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER,
        credentialSigner: createCredentialSignerWithKey(this._feedBuilder.keyring, this.identityKey)
      }
    });
  }

  async createSpace(
    identityKey: PublicKey = this.identityKey,
    spaceKey?: PublicKey,
    genesisKey?: PublicKey
  ): Promise<Space> {
    if (!spaceKey) {
      spaceKey = await this.keyring.createKey();
    }

    const dataFeedKey = await this.keyring.createKey();
    const dataFeed = await this.feedStore.openFeed(dataFeedKey, { writable: true });

    const controlFeedKey = await this.keyring.createKey();
    const controlFeed = await this.feedStore.openFeed(controlFeedKey, { writable: true });
    const genesisFeed = genesisKey ? await this.feedStore.openFeed(genesisKey) : controlFeed;

    const space = new Space({
      spaceKey,
      protocol: this.createSpaceProtocol(spaceKey),
      genesisFeed,
      controlFeed,
      dataFeed,
      feedProvider: (feedKey) => this.feedStore.openFeed(feedKey),
      databaseFactory: async ({ databaseBackend }) =>
        new Database(new ModelFactory().registerModel(ObjectModel), databaseBackend, identityKey)
    });

    this._spaces.set(spaceKey, space);
    return space;
  }

  createSpaceProtocol(topic: PublicKey, plugins: Plugin[] = []) {
    return new SpaceProtocol({
      topic,
      identity: {
        peerKey: this.deviceKey,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      networkManager: this._networkManagerProvider(),
      plugins
    });
  }
}
