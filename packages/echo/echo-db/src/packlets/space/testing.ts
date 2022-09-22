//
// Copyright 2022 DXOS.org
//

import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext, SignalManager } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import { Timeframe } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import { codec } from '../../codec';
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

    const controlFeed = await this.createFeed();
    const dataFeed = await this.createFeed();

    const genesisFeed = genesisKey ? await this.feedStore.openReadOnlyFeed(genesisKey) : controlFeed;

    const space = new Space({
      spaceKey,
      genesisFeed,
      controlFeed,
      dataFeed,
      feedProvider: key => this.feedStore.openReadOnlyFeed(key),
      initialTimeframe: new Timeframe(),
      networkManager: new NetworkManager({ signalManager: this._signalManager }),
      networkPlugins: [],
      swarmIdentity: {
        peerKey: identityKey,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialAuthenticator: MOCK_AUTH_VERIFIER
      }
    });

    return {
      space,
      genesisKey: genesisFeed.key,
      controlKey: controlFeed.key,
      dataKey: dataFeed.key
    };
  }

  async createFeed () {
    const feedKey = await this.keyring.createKey();
    return this.feedStore.openReadWriteFeedWithSigner(feedKey, this.keyring);
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
