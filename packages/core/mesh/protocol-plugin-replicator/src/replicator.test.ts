//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import crypto from 'crypto';
import eos from 'end-of-stream';
import multi from 'multi-read-stream';
import waitForExpect from 'wait-for-expect';

import { discoveryKey } from '@dxos/crypto';
import { createBatchStream, FeedDescriptor, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { Protocol } from '@dxos/mesh-protocol';
import { ProtocolNetworkGenerator } from '@dxos/protocol-network-generator';
import { Feed as FeedData } from '@dxos/protocols/proto/dxos/mesh/replicator';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { boolGuard } from '@dxos/util';

import { Replicator, ReplicatorMiddleware } from './replicator';

const noop = () => {};

interface MiddlewareOptions {
  feedStore: FeedStore
  onUnsubscribe?: (feedStore: FeedStore) => void
  onLoad?: (feedStore: FeedStore) => FeedDescriptor[]
}

const middleware = ({ feedStore, onUnsubscribe = noop, onLoad = () => [] }: MiddlewareOptions): ReplicatorMiddleware => {
  const encodeFeed = (feed: FeedDescriptor): FeedData => ({
    key: feed.key.asBuffer(), // TODO(dmaretskyi): Has to be buffer because of broken encoding.
    discoveryKey: feed.feed.discoveryKey
  });

  return {
    subscribe: (next) => {
      const unsubscribe = feedStore.feedOpenedEvent.on((descriptor) => next([encodeFeed(descriptor)]));
      return () => {
        onUnsubscribe(feedStore);
        unsubscribe();
      };
    },
    load: async () => {
      const feeds = onLoad(feedStore);
      return feeds.map(
        feed => encodeFeed(feed)
      );
    },
    replicate: async (feeds: FeedData[]) => {
      const hypercoreFeeds = await Promise.all(feeds.map(async (feedData) => {
        if (feedData.key) {
          const feed = await feedStore.openReadOnlyFeed(PublicKey.from(feedData.key));
          return feed.feed;
        }

        return null;
      }));

      return hypercoreFeeds.filter(boolGuard);
    }
  };
};

const generator = new ProtocolNetworkGenerator(async (topic, peerId) => {
  const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory('feed'), { valueEncoding: 'utf8' });
  const keyring = new Keyring();
  const feed = await feedStore.openReadWriteFeedWithSigner(
    await keyring.createKey(),
    keyring
  );
  let closed = false;

  const replicator = new Replicator(middleware({
    feedStore,
    onLoad: () => [feed],
    onUnsubscribe: () => {
      closed = true;
    }
  }));

  return {
    id: peerId,
    getFeedsNum: () => Array.from((feedStore as any)._descriptors.values()).length,
    createStream: ({ initiator }) => new Protocol({
      initiator: !!initiator,
      discoveryKey: discoveryKey(topic),
      streamOptions: {
        live: true
      },
      userSession: { peerId: 'session1' }
    })
      .setContext({ name: 'foo' })
      .setExtensions([replicator.createExtension()])
      .init()
      .stream,
    append: (msg: any) => feed.append(msg),
    getMessages: () => {
      const messages: any[] = [];
      const stream = multi.obj(Array.from((feedStore as any)._descriptors.values()).map((descriptor: any) => createBatchStream(descriptor.feed)));
      stream.on('data', (data: any[]) => {
        messages.push(data[0].data);
      });
      return new Promise((resolve, reject) => {
        eos(stream, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(messages.sort());
          }
        });
      });
    },
    isClosed: () => closed
  };
});

// Skipped until better times.
describe.skip('test data replication in a balanced network graph of 15 peers', function () {
  this.timeout(30000);

  const topic = crypto.randomBytes(32);
  let network: any;

  before(async function () {
    network = await generator.balancedBinTree({
      topic,
      parameters: [3]
    });
  });

  it('feed synchronization', async function () {
    expect(network.peers.length).to.equal(15);

    await waitForExpect(() => {
      const result = network.peers.reduce((prev: boolean, peer: any) => prev && peer.getFeedsNum() === network.peers.length, true);

      expect(result).to.be.true;
    }, 4500, 1000);
  });

  it('message synchronization', async function () {
    const messages: any[] = [];
    const wait: any[] = [];
    network.peers.forEach((peer: any) => {
      const msg = `${peer.id.toString('hex')}:foo`;
      messages.push(msg);
      wait.push(peer.append(msg));
    });
    messages.sort();

    await Promise.all(wait);

    await waitForExpect(async () => {
      const results: any = [];
      network.peers.forEach((peer: any) => {
        results.push(peer.getMessages());
      });
      for await (const nodeMessages of results) {
        expect(nodeMessages).to.deep.equal(messages);
      }
    }, 15 * 1000, 5 * 1000);

    const end = network.destroy();

    await waitForExpect(() => {
      let closed = true;
      for (const peer of network.peers) {
        closed = closed && peer.isClosed();
        if (!closed) {
          break;
        }
      }
      expect(closed).to.be.true;
    });

    await end;
  });
});
