//
// Copyright 2020 DXOS.org
//

import Chance from 'chance';
import hypercore from 'hypercore';
import pify from 'pify';
import ram from 'random-access-memory';
import tempy from 'tempy';

import { Codec } from '@dxos/codec-protobuf';
import { createId, keyToString } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';

import { sink } from './util';

import { dxos } from './proto/gen/testing';
import TestingSchema from './proto/gen/testing.json';

const chance = new Chance();

const codec = new Codec('dxos.echo.testing.Envelope')
  .addJson(TestingSchema)
  .build();

interface IBlock {
  data: dxos.echo.testing.Envelope
}

// Streams: https://devhints.io/nodejs-stream

describe('Stream tests', () => {
  /**
   * Basic proto envelope encoding.
   */
  test('proto encoding', () => {
    const buffer = codec.encode({
      message: {
        __type_url: 'dxos.echo.testing.ItemMutation',
        value: 'message-1'
      }
    });

    const { message: { value } } = codec.decode(buffer);
    expect(value).toBe('message-1');
  });

  /**
   * Basic hypercore (feed) encoding.
   */
  test('hypercore encoding', async () => {
    const feed = hypercore(ram, { valueEncoding: codec });

    await pify(feed.append.bind(feed))({
      message: {
        __type_url: 'dxos.echo.testing.ItemMutation',
        value: 'message-1'
      }
    });

    const { message: { value } } = await pify(feed.get.bind(feed))(0);
    expect(value).toBe('message-1');
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
      await feed.append({
        message: {
          __type_url: 'dxos.echo.testing.ItemMutation',
          value: createId()
        }
      });
    }

    // Test stream.
    const ids = new Set();
    const stream = feedStore.createReadStream({ live: true });
    stream.on('data', (block: IBlock) => {
      const { data: { message } } = block;
      const { value } = (message as unknown as dxos.echo.testing.ItemMutation);
      ids.add(value);
    });

    await sink(stream, 'data', config.numBlocks);

    expect(ids.size).toBe(config.numBlocks);
    for (const descriptor of descriptors) {
      const { path, feed } = descriptor;
      expect(feed.length).toBe(count.get(path));
    }

    feedStore.close();
  });

  /* eslint-disable no-lone-blocks */
  test('Feed opening and closing', async () => {
    const directory = tempy.directory();

    let feedKey;

    {
      const feedStore = new FeedStore(directory, { feedOptions: { valueEncoding: codec } });
      await feedStore.open();

      const feed = await feedStore.openFeed('test');
      feedKey = feed.key;

      await pify(feed.append.bind(feed))({
        message: {
          __type_url: 'dxos.echo.testing.ItemMutation',
          value: createId()
        }
      });

      await feedStore.close();
    }

    {
      const feedStore = new FeedStore(directory, { feedOptions: { valueEncoding: codec } });
      await feedStore.open();

      const feed = await feedStore.openFeed('test');
      expect(keyToString(feedKey)).toBe(keyToString(feed.key));

      const readable = feedStore.createReadStream({ live: true });
      await sink(readable, 'data', 1);

      await feedStore.close();
    }
  });
});
