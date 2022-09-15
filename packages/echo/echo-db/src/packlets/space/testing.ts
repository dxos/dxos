//
// Copyright 2022 DXOS.org
//

import { codec } from '@dxos/echo-protocol';
import { FeedDescriptor, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { MemorySignalManager, MemorySignalManagerContext, SignalManager } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import { MOCK_CREDENTIAL_AUTHENTICATOR, MOCK_CREDENTIAL_PROVIDER } from '../space';
import { Space } from './space';

export type TestSpaceContext = {
  space: Space
  genesisFeedKey: PublicKey
  controlFeed: FeedDescriptor
  dataFeed: FeedDescriptor
}

/**
 * Independent agent able to swarm and create spaces.
 */
export class TestAgent {
  public readonly feedStore = new FeedStore(
    createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec }
  );

  constructor (
    public readonly keyring: Keyring,
    public readonly identityKey: PublicKey,
    public readonly deviceKey: PublicKey,
    private readonly _signalManager: SignalManager
  ) {}

  async createSpace (
    identityKey: PublicKey,
    spaceKey?: PublicKey,
    genesisKey?: PublicKey
  ): Promise<TestSpaceContext> {
    if (!spaceKey) {
      spaceKey = await this.keyring.createKey();
    }

    const controlWriteFeed = await this.createFeed();
    const dataWriteFeed = await this.createFeed();

    const genesisFeed = genesisKey ? await this.feedStore.openReadOnlyFeed(genesisKey) : controlWriteFeed;

    const space = new Space({
      spaceKey,
      genesisFeed,
      controlWriteFeed, // TODO(burdon): Rename controlFeed?
      dataWriteFeed,
      feedProvider: key => this.feedStore.openReadOnlyFeed(key),
      initialTimeframe: new Timeframe(),
      networkManager: new NetworkManager({ signalManager: this._signalManager }),
      networkPlugins: [],
      swarmIdentity: {
        peerKey: identityKey,
        credentialProvider: MOCK_CREDENTIAL_PROVIDER,
        credentialAuthenticator: MOCK_CREDENTIAL_AUTHENTICATOR
      }
    });

    return {
      space,
      genesisFeedKey: genesisFeed.key,
      controlFeed: controlWriteFeed,
      dataFeed: dataWriteFeed
    };
  }

  async createFeed () {
    const feedKey = await this.keyring.createKey();
    return this.feedStore.openReadWriteFeedWithSigner(feedKey, this.keyring);
  }
}

/**
 * Generate agent and space.
 */
// TODO(burdon): Factor out and share across tests?
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
