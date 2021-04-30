//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import faker from 'faker';
import pify from 'pify';
import ram from 'random-access-memory';
import { Writable } from 'stream';
import tempy from 'tempy';

import { createId, keyToString, randomBytes, PublicKey } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';
import { createWritableFeedStream, latch, sink } from '@dxos/util';

import { codec, createTestItemMutation, FeedMessage } from '../proto';
import { Timeframe } from '../spacetime';
import { FeedBlock, FeedKey } from '../types';

faker.seed(1);

//
// Streams: https://devhints.io/nodejs-stream
//

describe('Stream tests', () => {
  /* eslint-disable no-lone-blocks */
  test('Opening and closing FeedStore', async () => {
    const directory = tempy.directory();

    let feedKey: FeedKey;

    {
      const feedStore = new FeedStore(directory, { feedOptions: { valueEncoding: codec } });
      await feedStore.open();

      const feed = await feedStore.openFeed('test-feed');
      feedKey = PublicKey.from(feed.key);

      const itemId = createId();
      await pify(feed.append.bind(feed))(createTestItemMutation(itemId, 'value', 'test'));

      await feedStore.close();
    }

    {
      const feedStore = new FeedStore(directory, { feedOptions: { valueEncoding: codec } });
      await feedStore.open();

      const feed = await feedStore.openFeed('test-feed');
      expect(feedKey.toHex()).toBe(keyToString(feed.key));

      const readStream = feedStore.createReadStream({ live: true });
      await sink(readStream, 'data', 1);

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
      outputStream.write(createTestItemMutation(itemId, 'value', String(i)));
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

    // Create messages randonly for different feeds.
    const count = new Map();
    for (let i = 0; i < config.numBlocks; i++) {
      // Randomly create items.
      const { path, feed } = faker.random.arrayElement(descriptors);
      count.set(path, (count.get(path) ?? 0) + 1);
      const itemId = createId();
      await feed.append(createTestItemMutation(itemId, 'value', String(i)));
    }

    // Test stream.
    const ids = new Set();
    const stream = feedStore.createReadStream({ live: true });
    stream.on('data', (block: FeedBlock) => {
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

  test('message serialization', () => {
    const message: FeedMessage = {
      echo: {
        timeframe: new Timeframe([[PublicKey.from(randomBytes(PublicKey.LENGTH)), 23]]),
        itemId: createId()
      }
    };

    const serialized = codec.encode(message);
    const decoded = codec.decode(serialized);

    expect(decoded).toEqual(message);
  });
});
