//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';
import eos from 'end-of-stream';
import multi from 'multi-read-stream';
import pify from 'pify';
import waitForExpect from 'wait-for-expect';

import { createKeyPair, discoveryKey } from '@dxos/crypto';
import { createBatchStream, FeedStore, HypercoreFeed } from '@dxos/feed-store';
import { Protocol } from '@dxos/mesh-protocol';
import { ProtocolNetworkGenerator } from '@dxos/protocol-network-generator';
import { PublicKey } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { boolGuard } from '@dxos/util';

import { Feed as FeedData } from './proto/gen/dxos/protocol/replicator';
import { Replicator, ReplicatorMiddleware } from './replicator';
import { Keyring } from '@dxos/keyring';

jest.setTimeout(30000);

const noop = () => {};

interface MiddlewareOptions {
  feedStore: FeedStore
  onUnsubscribe?: (feedStore: FeedStore) => void
  onLoad?: (feedStore: FeedStore) => HypercoreFeed[]
}

const middleware = ({ feedStore, onUnsubscribe = noop, onLoad = () => [] }: MiddlewareOptions): ReplicatorMiddleware => {
  const encodeFeed = (feed: HypercoreFeed): FeedData => ({
    key: feed.key,
    discoveryKey: feed.discoveryKey
  });

  const decodeFeed = (feed: FeedData): FeedData => ({
    key: feed.key,
    discoveryKey: feed.discoveryKey
  });

  return {
    subscribe: (next) => {
      const unsubscribe = feedStore.feedOpenedEvent.on((descriptor) => next([encodeFeed(descriptor.feed!)]));
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
      const hypercoreFeeds = await Promise.all(feeds.map(async (feed) => {
        const { key } = decodeFeed(feed);

        if (key) {
          const { feed } = await feedStore.openReadOnlyFeed(PublicKey.from(key));
          return feed;
        }

        return null;
      }));

      return hypercoreFeeds.filter(boolGuard);
    }
  };
};

const generator = new ProtocolNetworkGenerator(async (topic, peerId) => {
  const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory('feed'), { valueEncoding: 'utf8' });
  const keyring = new Keyring()
  const { feed } = await feedStore.openReadWriteFeedWithSigner(
    await keyring.createKey(),
    keyring
  );
  const append = pify(feed.append.bind(feed));
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
    append: (msg: any) => append(msg),
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

describe('test data replication in a balanced network graph of 15 peers', () => {
  const topic = crypto.randomBytes(32);
  let network: any;

  beforeAll(async () => {
    network = await generator.balancedBinTree({
      topic,
      parameters: [3]
    });
  });

  test('feed synchronization', async () => {
    expect(network.peers.length).toBe(15);

    await waitForExpect(() => {
      const result = network.peers.reduce((prev: boolean, peer: any) => prev && peer.getFeedsNum() === network.peers.length, true);

      expect(result).toBe(true);
    }, 4500, 1000);
  });

  test('message synchronization', async () => {
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
        expect(nodeMessages).toEqual(messages);
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
      expect(closed).toBe(true);
    });

    await end;
  });
});
