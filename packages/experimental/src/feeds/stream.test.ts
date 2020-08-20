//
// Copyright 2020 DXOS.org
//

import Chance from 'chance';
import pify from 'pify';
import ram from 'random-access-memory';
import { Writable } from 'stream';
import tempy from 'tempy';

import { createId, keyToString } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';

import { latch, sink } from '../util';
import { createSetPropertyMutation } from '../testing';

import { codec } from '../proto';
import { createWritableFeedStream } from './stream';
import { IFeedBlock } from './types';
import assert from 'assert';

const chance = new Chance(999);

//
// Streams: https://devhints.io/nodejs-stream
//

describe('Stream tests', () => {
  /* eslint-disable no-lone-blocks */
  test('Opening and closing FeedStore', async () => {
    const directory = tempy.directory();

    let feedKey;

    {
      const feedStore = new FeedStore(directory, { feedOptions: { valueEncoding: codec } });
      await feedStore.open();

      const feed = await feedStore.openFeed('test-feed');
      feedKey = feed.key;

      await pify(feed.append.bind(feed))({
        payload: {
          __type_url: 'dxos.echo.testing.TestItemMutation',
          value: createId()
        }
      });

      await feedStore.close();
    }

    {
      const feedStore = new FeedStore(directory, { feedOptions: { valueEncoding: codec } });
      await feedStore.open();

      const feed = await feedStore.openFeed('test-feed');
      expect(keyToString(feedKey)).toBe(keyToString(feed.key));

      const readable = feedStore.createReadStream({ live: true });
      await sink(readable, 'data', 1);

      await feedStore.close();
    }
  });

  test('feed streams', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();

    const feed = await feedStore.openFeed('test-feed');
    const inputStream = feedStore.createReadStream({ live: true, feedStoreInfo: true });

    const count = 5;
    const [counter, updateCounter] = latch(5);
    inputStream.pipe(new Writable({
      objectMode: true,
      write (message, _, callback) {
        const { data: { echo: { itemId } } } = message;
        expect(itemId).toBeTruthy();
        updateCounter();
        callback();
      }
    }));

    const itemId = createId();
    const outputStream = createWritableFeedStream(feed);
    for (let i = 0; i < count; i++) {
      outputStream.write(createSetPropertyMutation(itemId, `key-${i}`, `${i}`));
    }

    await counter;
  });

  /**
   * FeedStore Streams with encoding.
   */
  test('message streams', async () => {
    const config = {
      numFeeds: 5,
      numBlocks: 100
    };

    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();

    // Create feeds.
    for (let i = 0; i < config.numFeeds; i++) {
      await feedStore.openFeed(`feed-${i}`);
    }

    const descriptors = feedStore.getDescriptors();
    expect(descriptors).toHaveLength(config.numFeeds);

    // Create messages.
    const count = new Map();
    for (let i = 0; i < config.numBlocks; i++) {
      const { path, feed } = chance.pickone(descriptors);
      count.set(path, (count.get(path) ?? 0) + 1);
      await feed.append(createSetPropertyMutation(createId(), `key-${i}`, `${i}`));
    }

    // Test stream.
    const ids = new Set();
    const stream = feedStore.createReadStream({ live: true });
    stream.on('data', (block: IFeedBlock) => {
      assert(block.data.echo);
      const { data: { echo: { itemId } } } = block;
      ids.add(itemId);
    });

    await sink(stream, 'data', config.numBlocks);

    expect(ids.size).toBe(config.numBlocks);
    for (const descriptor of descriptors) {
      const { path, feed } = descriptor;
      expect(feed.length).toBe(count.get(path));
    }

    feedStore.close();
  });
});
