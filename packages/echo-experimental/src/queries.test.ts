//
// Copyright 2020 DXOS.org
//

import Chance from 'chance';
import debug from 'debug';
import ram from 'random-access-memory';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { Codec } from '@dxos/codec-protobuf';
import { createId } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';

import { dxos } from './proto/gen/testing';
import TestingSchema from './proto/gen/testing.json';

import { Indexer } from './indexer';

const log = debug('dxos:echo:testing');
debug.enable('dxos:echo:*');

const chance = new Chance();

const codec = new Codec('dxos.echo.testing.Envelope')
  .addJson(TestingSchema)
  .build();

/**
 * FeedStore Streams with encoding.
 */
test('message query streams', async () => {
  const config = {
    numFeeds: 5,
    numBlocks: 100,
    maxChunks: 20,
    tags: ['red', 'green', 'blue']
  };

  const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
  await feedStore.open();

  // Create feeds.
  for (let i = 0; i < config.numFeeds; i++) {
    await feedStore.openFeed(`feed-${i}`);
  }

  // Create streamer.
  const stream = feedStore.createReadStream({ live: true });
  const streamer = new Indexer(stream);

  const descriptors = feedStore.getDescriptors();
  expect(descriptors).toHaveLength(config.numFeeds);

  const selection = config.tags[0];

  // Generate messages.
  let blocks = 0;
  const last = new Map();
  const counters = new Map();
  const generator = async () => {
    const num = chance.integer({ min: 1, max: Math.min(config.numBlocks - blocks, config.maxChunks) });
    for (let i = 0; i < num; i++) {
      const { feed } = chance.pickone(descriptors);
      const tag = chance.pickone(config.tags);
      const id = createId();

      await feed.append({
        message: {
          __type_url: 'dxos.echo.testing.TestMessage',
          id,
          depends: last.get(tag),
          tag
        }
      });

      last.set(tag, id);

      counters.set(tag, (counters.get(tag) || 0) + 1);
      blocks++;
    }
  };

  // Generate messages sporadically after subscription
  const interval = setInterval(async () => {
    await generator();

    log('Blocks', blocks);
    if (blocks === config.numBlocks) {
      clearInterval(interval);
    }
  }, 100);

  await sleep(300);

  // Create subscription.
  let count = 0;
  const results = streamer.subscribe(selection);
  results.on('data', (messages: dxos.echo.testing.TestMessage[]) => {
    messages.forEach(message => {
      const { id, tag } = message;
      expect(tag).toBe(selection);
      log(JSON.stringify(id));
      count++;
    });
  });

  await waitForExpect(() => {
    expect(blocks).toBe(config.numBlocks);
    expect(count).toBe(counters.get(selection));
    feedStore.close();
  });
});
