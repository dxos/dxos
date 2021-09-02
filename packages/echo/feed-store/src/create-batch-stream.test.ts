//
// Copyright 2021 DXOS.org
//

import pify from 'pify';
import waitForExpect from 'wait-for-expect';

import { createKeyPair, PublicKey } from '@dxos/crypto';
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';

import { createBatchStream } from './create-batch-stream';
import { FeedStore } from './feed-store';
import { HypercoreFeed } from './hypercore-types';

const createFeed = async () => {
  const feedStore = new FeedStore(createStorage('', STORAGE_RAM), { feedOptions: { valueEncoding: 'utf-8' } });
  await feedStore.open();
  const { publicKey, secretKey } = createKeyPair();
  const feed = await feedStore.createReadWriteFeed({ key: PublicKey.from(publicKey), secretKey: secretKey });
  return feed;
};

const append = (feed: HypercoreFeed, message: any) => {
  return pify(feed.append.bind(feed))(message);
};

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
