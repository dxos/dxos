//
// Copyright 2021 DXOS.org
//

import pify from 'pify';
import waitForExpect from 'wait-for-expect';

import { createKeyPair } from '@dxos/crypto';
import { PublicKey } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import { createBatchStream } from './create-batch-stream';
import { FeedStore } from './feed-store';
import { HypercoreFeed } from './hypercore-types';

const createFeed = async () => {
  const feedStore = new FeedStore(createStorage('', StorageType.RAM).directory('feed'), { valueEncoding: 'utf-8' });
  const { publicKey, secretKey } = createKeyPair();
  const { feed } = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
  return feed;
};

const append = (feed: HypercoreFeed, message: any) => pify(feed.append.bind(feed))(message);

describe('Batch stream', () => {
  test('Single message', async () => {
    const feed = await createFeed();
    const stream = createBatchStream(feed, { live: true });
    const messages: any[] = [];
    stream.on('data', (data) => {
      data.forEach((message: any) => {
        messages.push(message.data);
      });
    });
    const msg = PublicKey.random().toString();
    await append(feed, msg);
    await waitForExpect(() => {
      expect(messages).toContain(msg);
    });
  });

  test('Five messages', async () => {
    const feed = await createFeed();
    const stream = createBatchStream(feed, { live: true });
    const messages: any[] = [];
    stream.on('data', (data) => {
      data.forEach((message: any) => {
        messages.push(message.data);
      });
    });
    const sent = Array.from(Array(5)).map(() => PublicKey.random().toString());
    for (const msg of sent) {
      await append(feed, msg);
    }
    await waitForExpect(() => {
      for (const msg of sent) {
        expect(messages).toContain(msg);
      }
    });
  });
});
