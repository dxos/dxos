//
// Copyright 2022 DXOS.org
//

import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext, SignalManager } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { inMemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';

import { codec } from '../common';
import { Database } from '../database';
import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER } from './auth-plugin';
import { Space } from './space';

// TODO(burdon): Factor out and share across tests?

export type TestSpaceContext = {
  space: Space
  genesisKey: PublicKey
  controlKey: PublicKey
  dataKey: PublicKey
}

/**
 * Independent agent able to swarm and create spaces.
 */
export class TestAgent {
  public readonly feedStore: FeedStore<FeedMessage>;

  constructor (
    public readonly keyring: Keyring,
    public readonly identityKey: PublicKey,
    public readonly deviceKey: PublicKey,
    private readonly _signalManager: SignalManager
  ) {
    this.feedStore = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: createStorage({ type: StorageType.RAM }).createDirectory(),
        signer: keyring,
        hypercore: {
          valueEncoding: codec
        }
      })
    });
  }

  async createSpace (
    identityKey: PublicKey,
    spaceKey?: PublicKey,
    genesisKey?: PublicKey
  ): Promise<TestSpaceContext> {
    if (!spaceKey) {
      spaceKey = await this.keyring.createKey();
    }

    const controlFeed = await this.createFeed();
    const dataFeed = await this.createFeed();

    const genesisFeed = genesisKey ? await this.feedStore.openFeed(genesisKey) : controlFeed;

    const space = new Space({
      spaceKey,
      genesisFeed,
      controlFeed,
      dataFeed,
      feedProvider: feedKey => this.feedStore.openFeed(feedKey),
      initialTimeframe: new Timeframe(),
      networkManager: new NetworkManager({
        signalManager: this._signalManager,
        transportFactory: inMemoryTransportFactory
      }),
      networkPlugins: [],
      swarmIdentity: {
        peerKey: identityKey,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      },
      databaseFactory: async ({ databaseBackend }) =>
        new Database(new ModelFactory().registerModel(ObjectModel), databaseBackend, identityKey)
    });

    return {
      space,
      genesisKey: genesisFeed.key,
      controlKey: controlFeed.key,
      dataKey: dataFeed.key
    };
  }

  async createFeed () {
    const key = await this.keyring.createKey();
    return this.feedStore.openFeed(key, { writable: true });
  }
}

/**
 * Creates test agents with common signaling.
 */
export class TestAgentFactory {
  constructor (
    private readonly _signalContext: MemorySignalManagerContext = new MemorySignalManagerContext()
  ) {}

  async createAgent (): Promise<TestAgent> {
    const keyring = new Keyring();
    const identityKey = await keyring.createKey();
    const deviceKey = await keyring.createKey();

    return new TestAgent(keyring, identityKey, deviceKey, new MemorySignalManager(this._signalContext));
  }
}
