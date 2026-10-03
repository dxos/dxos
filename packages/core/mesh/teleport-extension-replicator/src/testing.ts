//
// Copyright 2022 DXOS.org
//

import { onTestFinished } from 'vitest';

import { type HypercoreCreateOptions, HypercoreFactory, HypercoreStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { Teleport, connectDuplexStreams } from '@dxos/teleport';
import { range } from '@dxos/util';

import { ReplicatorExtension } from './replicator-extension.ts';

export class TestBuilder {
  createAgent(): TestAgent {
    return new TestAgent();
  }
}

// TODO(dmaretskyi): Unify with the agent in stress.test.ts.
export class TestAgent {
  public storage = createStorage({ type: StorageType.RAM });
  public keyring = new Keyring(this.storage.createDirectory('keyring'));
  public hypercoreStore = new HypercoreStore({
    factory: new HypercoreFactory({ root: this.storage.createDirectory('feeds'), signer: this.keyring }),
  });

  async createWriteFeed(numBlocks = 0) {
    const feed = await this.hypercoreStore.openHypercore(await this.keyring.createKey(), { writable: true });

    for (const i of range(numBlocks)) {
      await feed.append(Buffer.from(`data-${i}`));
    }

    return feed;
  }

  createReadFeed(key: PublicKey, opts?: HypercoreCreateOptions) {
    return this.hypercoreStore.openHypercore(key, opts);
  }
}

/**
 * Simulates two peers connected via P2P network.
 */
export const createStreamPair = async () => {
  const peerId1 = PublicKey.random();
  const peerId2 = PublicKey.random();

  const peer1 = new Teleport({ initiator: true, localPeerId: peerId1, remotePeerId: peerId2 });
  const peer2 = new Teleport({ initiator: false, localPeerId: peerId2, remotePeerId: peerId1 });

  // An aborted pipe is how a closed peer surfaces here, so it is logged rather than raised.
  connectDuplexStreams(peer1.stream, peer2.stream, (err) => log('stream pair pipe ended', { err }));
  onTestFinished(() => peer1.close());
  onTestFinished(() => peer2.close());

  await Promise.all([peer1.open(), peer2.open()]);

  return { peer1, peer2 };
};

/**
 * Two peers with replicator extensions pre-registered.
 */
export const createReplicatorPair = async () => {
  const { peer1, peer2 } = await createStreamPair();

  const replicator1 = new ReplicatorExtension();
  peer1.addExtension('dxos.mesh.teleport.replicator', replicator1);

  const replicator2 = new ReplicatorExtension();
  peer2.addExtension('dxos.mesh.teleport.replicator', replicator2);

  return { replicator1, replicator2 };
};
