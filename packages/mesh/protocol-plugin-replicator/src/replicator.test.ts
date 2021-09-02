//
// Copyright 2021 DXOS.org
//

import bufferJson from 'buffer-json-encoding';
import crypto from 'crypto';
import eos from 'end-of-stream';
import multi from 'multi-read-stream';
import pify from 'pify';
import waitForExpect from 'wait-for-expect';

import { createKeyPair, discoveryKey, PublicKey } from '@dxos/crypto';
import { createBatchStream, FeedDescriptor, FeedStore, HypercoreFeed } from '@dxos/feed-store';
import { Protocol } from '@dxos/protocol';
import { ProtocolNetworkGenerator } from '@dxos/protocol-network-generator';
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';

import { Feed as FeedData } from './proto/gen/dxos/protocol/replicator';
import { Replicator, ReplicatorMiddleware } from './replicator';

jest.setTimeout(30000);

const noop = () => {};

// TODO(yivlad): Move to utils
const notNull = <T>(value: T | null | undefined): value is T => Boolean(value);

interface MiddlewareOptions {
  feedStore: FeedStore,
  onUnsubscribe?: (feedStore: FeedStore) => void,
  onLoad?: (feedStore: FeedStore) => HypercoreFeed[],
}

const middleware = ({ feedStore, onUnsubscribe = noop, onLoad = () => [] }: MiddlewareOptions): ReplicatorMiddleware => {
  const encodeFeed = (feed: HypercoreFeed, descriptor?: FeedDescriptor): FeedData => ({
    key: feed.key,
    discoveryKey: feed.discoveryKey,
    metadata: descriptor?.metadata && bufferJson.encode(descriptor.metadata)
  });

  const decodeFeed = (feed: FeedData): FeedData & { metadata: any } => ({
    key: feed.key,
    discoveryKey: feed.discoveryKey,
    metadata: feed.metadata && bufferJson.decode(feed.metadata)
  });

  return {
    subscribe (next) {
      const unsubscribe = feedStore.feedOpenedEvent.on((descriptor) => next([encodeFeed(descriptor.feed!, descriptor)]));
      return () => {
        onUnsubscribe(feedStore);
        unsubscribe();
      };
    },
    async load () {
      const feeds = onLoad(feedStore);
      return feeds.map(
        feed => encodeFeed(
          feed,
          feedStore.getDescriptorByDiscoveryKey(feed.discoveryKey as any)
        )
      );
    },
    async replicate (feeds: FeedData[]) {
      const hypercoreFeeds = await Promise.all(feeds.map((feed) => {
        const { key, discoveryKey, metadata } = decodeFeed(feed);

        if (key) {
          const feed = feedStore.getOpenFeed(d => d.key.equals(key));

          if (feed) {
            return feed;
          }
          const publicKey = PublicKey.from(key);
          return feedStore.createReadOnlyFeed({ key: publicKey, metadata });
        }

        if (discoveryKey) {
          return feedStore.getOpenFeed(d => d.discoveryKey.equals(discoveryKey));
        }

        return null;
      }));

      return hypercoreFeeds.filter(notNull);
    }
  };
};

const generator = new ProtocolNetworkGenerator(async (topic, peerId) => {
  const feedStore = new FeedStore(createStorage('', STORAGE_RAM), { feedOptions: { valueEncoding: 'utf8' } });
  await feedStore.open();
  const { publicKey, secretKey } = createKeyPair();
  const feed = await feedStore.createReadWriteFeed({
    key: PublicKey.from(publicKey),
    secretKey,
    metadata: { topic: topic.toString('hex') }
  });
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
    getFeeds () {
      return feedStore.getOpenFeeds();
    },
    getDescriptors () {
      return feedStore.getDescriptors();
    },
    createStream ({ initiator }) {
      return new Protocol({
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
        .stream;
    },
    append (msg: any) {
      return append(msg);
    },
    getMessages () {
      const messages: any[] = [];
      const stream = multi.obj(feedStore.getOpenFeeds().map(feed => createBatchStream(feed)));
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
    isClosed () {
      return closed;
    }
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
      const result = network.peers.reduce((prev: boolean, peer: any) => {
        return prev && peer.getFeeds().length === network.peers.length;
      }, true);

      expect(result).toBe(true);
    }, 4500, 1000);

    let metadataOk = true;
    for (const peer of network.peers) {
      metadataOk = metadataOk && !peer.getDescriptors().find((d: FeedDescriptor) => !d.metadata || !d.metadata.topic);
    }

    expect(metadataOk).toBe(true);
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
