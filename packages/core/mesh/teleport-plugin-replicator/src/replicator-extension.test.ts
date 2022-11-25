//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { pipeline } from 'stream';

import { Event, sleep } from '@dxos/async';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { Teleport } from '@dxos/teleport';
import { afterTest } from '@dxos/testutils';
import { range } from '@dxos/util';

import { ReplicatorExtension } from './replicator-extension';

class TestBuilder {
  createAgent(): TestAgent {
    return new TestAgent();
  }
}

class TestAgent {
  public storage = createStorage({ type: StorageType.RAM });
  public keyring = new Keyring(this.storage.createDirectory('keyring'));
  public feedStore = new FeedStore({
    factory: new FeedFactory({ root: this.storage.createDirectory('feeds'), signer: this.keyring })
  });

  async createWriteFeed(numBlocks = 0) {
    const feed = await this.feedStore.openFeed(await this.keyring.createKey(), { writable: true });

    for (const i of range(numBlocks)) {
      await feed.append(Buffer.from(`data-${i}`));
    }

    return feed;
  }

  createReadFeed(key: PublicKey) {
    return this.feedStore.openFeed(key);
  }
}

const createStreamPair = async () => {
  const peerId1 = PublicKey.random();
  const peerId2 = PublicKey.random();

  const peer1 = new Teleport({ initiator: true, localPeerId: peerId1, remotePeerId: peerId2 });
  const peer2 = new Teleport({ initiator: false, localPeerId: peerId2, remotePeerId: peerId1 });

  pipeline(peer1.stream, peer2.stream, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.catch(err);
    }
  });
  pipeline(peer2.stream, peer1.stream, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.catch(err);
    }
  });
  afterTest(() => peer1.close());
  afterTest(() => peer2.close());

  await Promise.all([peer1.open(), peer2.open()]);

  const replicator1 = new ReplicatorExtension();
  peer1.addExtension('dxos.mesh.teleport.replicator', replicator1);

  const replicator2 = new ReplicatorExtension();
  peer2.addExtension('dxos.mesh.teleport.replicator', replicator2);

  return { peer1, replicator1, peer2, replicator2 };
};

describe('ReplicatorExtension', function () {
  it('replicates a feed', async function () {
    const builder = new TestBuilder();
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    const { peer1, replicator1, peer2, replicator2 } = await createStreamPair();

    replicator1.setOptions({ upload: true });
    replicator2.setOptions({ upload: true });

    const feed1 = await agent1.createWriteFeed(10);
    const feed2 = await agent2.createReadFeed(feed1.key);

    replicator1.addFeed(feed1);
    replicator2.addFeed(feed2);

    await Event.wrap(feed2, 'download').waitForCondition(() => feed2.length === 10);
  });

  it('does not upload data when upload is off', async function () {
    const builder = new TestBuilder();
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    const { peer1, replicator1, peer2, replicator2 } = await createStreamPair();

    replicator1.setOptions({ upload: false });
    replicator2.setOptions({ upload: true });

    const feed1 = await agent1.createWriteFeed(10);
    const feed2 = await agent2.createReadFeed(feed1.key);

    replicator1.addFeed(feed1);
    replicator2.addFeed(feed2);

    // Wait for events to be processed.
    await sleep(5);

    expect(feed2.length).toEqual(0);
  });

  it('selectively replicates 2 feeds in both directions', async function () {
    const builder = new TestBuilder();
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    const { peer1, replicator1, peer2, replicator2 } = await createStreamPair();

    replicator1.setOptions({ upload: false });
    replicator2.setOptions({ upload: true });

    const feed1A = await agent1.createWriteFeed(10);
    replicator1.addFeed(feed1A);
    const feed2A = await agent2.createReadFeed(feed1A.key);
    replicator2.addFeed(feed2A);

    const feed2B = await agent2.createWriteFeed(10);
    replicator2.addFeed(feed2B);
    const feed1B = await agent2.createReadFeed(feed2B.key);
    replicator1.addFeed(feed2B);

    // Wait for events to be processed.
    await Event.wrap(feed1B, 'download').waitForCondition(() => feed1B.length === 10);
    await sleep(5);

    expect(feed2A.length).toEqual(0);
  });

  it('add another feed mid replication', async function () {
    const builder = new TestBuilder();
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    const { peer1, replicator1, peer2, replicator2 } = await createStreamPair();

    replicator1.setOptions({ upload: true });
    replicator2.setOptions({ upload: true });

    const feed1A = await agent1.createWriteFeed(10);
    replicator1.addFeed(feed1A);
    const feed2A = await agent2.createReadFeed(feed1A.key);
    replicator2.addFeed(feed2A);

    await Event.wrap(feed2A, 'download').waitForCondition(() => feed2A.length === 10);

    const feed2B = await agent2.createWriteFeed(10);
    replicator2.addFeed(feed2B);
    const feed1B = await agent2.createReadFeed(feed2B.key);
    replicator1.addFeed(feed2B);

    await Event.wrap(feed1B, 'download').waitForCondition(() => feed1B.length === 10);
  });

  // TODO: not working yet.
  it.skip('enabling upload mid replication', async function () {
    const builder = new TestBuilder();
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    const { peer1, replicator1, peer2, replicator2 } = await createStreamPair();

    replicator1.setOptions({ upload: false });
    replicator2.setOptions({ upload: true });

    const feed1A = await agent1.createWriteFeed(10);
    replicator1.addFeed(feed1A);
    const feed2A = await agent2.createReadFeed(feed1A.key);
    replicator2.addFeed(feed2A);

    const feed2B = await agent2.createWriteFeed(10);
    replicator2.addFeed(feed2B);
    const feed1B = await agent2.createReadFeed(feed2B.key);
    replicator1.addFeed(feed2B);

    // Wait for events to be processed.
    await Event.wrap(feed1B, 'download').waitForCondition(() => feed1B.length === 10);
    await sleep(5);

    expect(feed2A.length).toEqual(0);

    replicator1.setOptions({ upload: true });

    // Wait for events to be processed.
    await Event.wrap(feed2A, 'download').waitForCondition(() => feed2A.length === 10);
  });
});
