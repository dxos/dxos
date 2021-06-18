//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';
import eos from 'end-of-stream';
import pify from 'pify';
import ram from 'random-access-memory';
import waitForExpect from 'wait-for-expect';

import { discoveryKey } from '@dxos/crypto';
import { FeedDescriptor, FeedStore } from '@dxos/feed-store';
import { Protocol } from '@dxos/protocol';
import { ProtocolNetworkGenerator } from '@dxos/protocol-network-generator';

import { DefaultReplicator } from '.';

jest.setTimeout(30000);

const generator = new ProtocolNetworkGenerator(async (topic, peerId) => {
  const feedStore = await FeedStore.create(ram, { feedOptions: { valueEncoding: 'utf8' } });
  const feed = await feedStore.openFeed('/feed', {
    metadata: { topic: topic.toString('hex') }
  } as any);
  const append = pify(feed.append.bind(feed));
  let closed = false;

  const replicator = new DefaultReplicator({
    feedStore,
    onLoad: () => [feed],
    onUnsubscribe: () => {
      closed = true;
    }
  });

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
        }
      })
        .setSession({ id: 'session1' })
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
      const stream = feedStore.createReadStream();
      stream.on('data', (data: any) => {
        messages.push(data.data);
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
