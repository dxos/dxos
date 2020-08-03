//
// Copyright 2020 DXOS.org
//

import Chance from 'chance';
import hypercore from 'hypercore';
import pify from 'pify';
import ram from 'random-access-memory';
import waitForExpect from 'wait-for-expect';

import { Codec } from '@dxos/codec-protobuf';
import { createId } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';

import { dxos } from './proto/gen/testing';
import TestingSchema from './proto/gen/testing.json';

const chance = new Chance();

const codec = new Codec('dxos.echo.testing.Envelope')
  .addJson(TestingSchema)
  .build();

interface IBlock {
  data: dxos.echo.testing.Envelope
}

/**
 * Basic proto envelope encoding.
 */
test('proto encoding', () => {
  const buffer = codec.encode({
    message: {
      __type_url: 'dxos.echo.testing.TestItemMutation',
      id: 'message-1'
    }
  });

  const { message: { id } } = codec.decode(buffer);
  expect(id).toBe('message-1');
});

/**
 * Basic hypercore (feed) encoding.
 */
test('hypercore encoding', async () => {
  const feed = hypercore(ram, { valueEncoding: codec });

  await pify(feed.append.bind(feed))({
    message: {
      __type_url: 'dxos.echo.testing.TestItemMutation',
      id: 'message-1'
    }
  });

  const { message: { id } } = await pify(feed.get.bind(feed))(0);
  expect(id).toBe('message-1');
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
        __type_url: 'dxos.echo.testing.TestItemMutation',
        id: createId()
      }
    });
  }

  // Test stream.
  const ids = new Set();
  const stream = feedStore.createReadStream({ live: true });
  stream.on('data', (block: IBlock) => {
    const { data: { message } } = block;
    const { id } = (message as dxos.echo.testing.TestItemMutation);
    ids.add(id);
  });

  await waitForExpect(() => {
    expect(ids.size).toBe(config.numBlocks);
    for (const descriptor of descriptors) {
      const { path, feed } = descriptor;
      expect(feed.length).toBe(count.get(path));
    }

    feedStore.close();
  });
});
