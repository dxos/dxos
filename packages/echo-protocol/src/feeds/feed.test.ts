//
// Copyright 2020 DXOS.org
//

import pify from 'pify';
import ram from 'random-access-memory';

import { FeedStore } from '@dxos/feed-store';

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
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();

    const feed = await feedStore.openFeed('test-feed');
    expect(feed.length).toBe(0);

    const data: FeedMessage = {};

    await pify(feed.append.bind(feed))(data);

    expect(feed.length).toBe(1);
    const block = await pify(feed.get.bind(feed))(0);
    expect(block).toEqual(data);
  });

  test('feed writer', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();

    const feed = await feedStore.openFeed('test-feed');
    const writer = createFeedWriter<FeedMessage>(feed);

    const data: FeedMessage = {
      echo: {
        genesis: {
          itemType: 'foo'
        }
      }
    };
    const receipt = await writer.write(data);

    expect(receipt.feedKey).toEqual(feed.key);
    expect(receipt.seq).toEqual(0);

    expect(feed.length).toEqual(1);

    const block = await pify(feed.get.bind(feed))(0);
    expect(block).toEqual(data);
  });
});
