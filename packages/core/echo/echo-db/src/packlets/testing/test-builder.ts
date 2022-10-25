//
// Copyright 2022 DXOS.org
//

import { FeedStore, TestBuilder } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { WebsocketSignalManager, MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManager, Plugin } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';

import { valueEncoding } from '../common';
import { Database } from '../database';
import { AuthProvider, AuthVerifier, Space, SpaceProtocol } from '../space';

// TODO(burdon): Create composite with feed-store builder.
// TODO(burdon): Use in other tests outside of echo.

/**
 * Builder with default encoder and generator.
 */
export class TestFeedBuilder extends TestBuilder<FeedMessage> {
  constructor() {
    super({
      valueEncoding
    });
  }
}

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

/**
 * Factory for test agents.
 */
export class TestAgentBuilder {
  private readonly _networkManagerProvider: NetworkManagerProvider;

  constructor({ networkManagerProvider }: { networkManagerProvider?: NetworkManagerProvider } = {}) {
    this._networkManagerProvider =
      networkManagerProvider ?? MemoryNetworkManagerProvider(new MemorySignalManagerContext());
  }

  async createPeer(): Promise<TestPeer> {
    const keyring = new Keyring(); // TODO(burdon): Merge with other builder.

    const identityKey = await keyring.createKey();
    const deviceKey = await keyring.createKey();

    return new TestPeer(this._networkManagerProvider, keyring, identityKey, deviceKey);
  }
}

/**
 * Test peer able to create and replicate spaces.
 */
export class TestPeer {
  public readonly builder: TestFeedBuilder;
  public readonly feedStore: FeedStore<FeedMessage>;

  constructor(
    public readonly _networkManagerProvider: NetworkManagerProvider,
    public readonly keyring: Keyring,
    public readonly identityKey: PublicKey,
    public readonly deviceKey: PublicKey
  ) {
    this.builder = new TestFeedBuilder().setKeyring(keyring);
    this.feedStore = this.builder.createFeedStore();
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
      initialTimeframe: new Timeframe(),
      feedProvider: (feedKey) => this.feedStore.openFeed(feedKey),
      databaseFactory: async ({ databaseBackend }) =>
        new Database(new ModelFactory().registerModel(ObjectModel), databaseBackend, identityKey)
    });
  }
}
