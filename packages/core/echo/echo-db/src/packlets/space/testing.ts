//
// Copyright 2022 DXOS.org
//

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
import { Database } from '../database';
import { AuthProvider, AuthVerifier } from './auth-plugin';
import { Space } from './space';
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
  private readonly _peers = new ComplexMap<PublicKey, TestPeer>(PublicKey.hash);
  private readonly _storage: Storage;
  private readonly _networkManagerProvider: NetworkManagerProvider;

  constructor({ storage, networkManagerProvider }: TestAgentBuilderOptions = {}) {
    this._storage = storage ?? createStorage({ type: StorageType.RAM });
    this._networkManagerProvider =
      networkManagerProvider ?? MemoryNetworkManagerProvider(new MemorySignalManagerContext());
  }

  get peers() {
    return Array.from(this._peers.values());
  }

  getPeer(deviceKey: PublicKey) {
    return this._peers.get(deviceKey);
  }

  async createPeer(): Promise<TestPeer> {
    // prettier-ignore
    const feedBuilder = new TestFeedBuilder()
      .setStorage(this._storage)
      .setDirectory(this._storage.createDirectory(`peer-${this._peers.size}`));

    const identityKey = await feedBuilder.keyring.createKey();
    const deviceKey = await feedBuilder.keyring.createKey();

    const peer = new TestPeer(this._networkManagerProvider, feedBuilder, identityKey, deviceKey);
    this._peers.set(deviceKey, peer);
    return peer;
  }
}

/**
 * Test peer able to create and replicate spaces.
 */
export class TestPeer {
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

    return new Space({
      spaceKey,
      protocol: this.createSpaceProtocol(spaceKey),
      genesisFeed,
      controlFeed,
      dataFeed,
      feedProvider: (feedKey) => this.feedStore.openFeed(feedKey),
      databaseFactory: async ({ databaseBackend }) =>
        new Database(new ModelFactory().registerModel(ObjectModel), databaseBackend, identityKey)
    });
  }
}
