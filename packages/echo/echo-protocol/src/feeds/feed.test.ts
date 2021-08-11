//
// Copyright 2020 DXOS.org
//

import pify from 'pify';

import { createKeyPair, PublicKey } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';

import { codec, FeedMessage } from '../proto';
import { createFeedWriter } from './feed-writer';

describe('Feed tests:', () => {
  test('codec', () => {
    const message1: FeedMessage = {};

    const buffer = codec.encode(message1);

    const message2 = codec.decode(buffer);

    expect(message1).toEqual(message2);
  });

  test('hypercore', async () => {
    const feedStore = new FeedStore(createStorage('', STORAGE_RAM), { feedOptions: { valueEncoding: codec } });
    await feedStore.open();

    const { publicKey, secretKey } = createKeyPair();
    const feed = await feedStore.createReadWriteFeed({ key: PublicKey.from(publicKey), secretKey });
    expect(feed.length).toBe(0);

    const data: FeedMessage = {};

    await pify(feed.append.bind(feed))(data);

    expect(feed.length).toBe(1);
    const block = await pify(feed.get.bind(feed))(0);
    expect(block).toEqual(data);
  });

  test('feed writer', async () => {
    const feedStore = new FeedStore(createStorage('', STORAGE_RAM), { feedOptions: { valueEncoding: codec } });
    await feedStore.open();

    const { publicKey, secretKey } = createKeyPair();
    const feed = await feedStore.createReadWriteFeed({ key: PublicKey.from(publicKey), secretKey });
    const writer = createFeedWriter<FeedMessage>(feed);

    const data: FeedMessage = {
      echo: {
        genesis: {
          itemType: 'foo'
        }
      }
    };
    const receipt = await writer.write(data);

    expect(receipt.feedKey.equals(feed.key)).toBe(true);
    expect(receipt.seq).toEqual(0);

    expect(feed.length).toEqual(1);

    const block = await pify(feed.get.bind(feed))(0);
    expect(block).toEqual(data);
  });
});
