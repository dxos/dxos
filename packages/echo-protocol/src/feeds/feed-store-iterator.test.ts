//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import Chance from 'chance';
import debug from 'debug';
import hypercore from 'hypercore';
import pify from 'pify';
import ram from 'random-access-memory';

import { createId, keyToString, PublicKey } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';
import { ComplexMap, latch } from '@dxos/util';

import { codec, createTestItemMutation, schema } from '../proto';
import { Timeframe } from '../spacetime';
import { FeedBlock, FeedKey } from '../types';
import { createIterator, FeedSelector } from './feed-store-iterator';

const chance = new Chance(999);

const log = debug('dxos:echo:feed-store-iterator:test');
debug.enable('dxos:echo:*');

describe('feed store iterator', () => {
  test('test message order', async () => {
    const config = {
      numFeeds: 2,
      numMessages: 10
    };

    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();

    //
    // Create the ordered feed stream.
    //

    // Update when processed downstream.
    let currentTimeframe = new Timeframe();

    // TODO(burdon): Factor out/generalize.
    // Select message based on timeframe.
    const messageSelector = (candidates: FeedBlock[]) => {
      log('Current:', currentTimeframe);

      // Create list of allowed candidates.
      const next = candidates.map((candidate, i) => {
        assert(candidate.data?.echo?.timeframe);
        const { data: { echo: { timeframe } } } = candidate;
        const dependencies = Timeframe.dependencies(timeframe, currentTimeframe);
        if (!dependencies.isEmpty()) {
          return;
        }

        return { i, candidate };
      }).filter(Boolean);

      // TODO(burdon): Create test for this (e.g., feed with depedencies hasn't synced yet).
      if (!next.length) {
        log('Waiting for dependencies...', candidates.map((candidate, i) => ({
          i, timeframe: candidate?.data?.echo?.timeframe
        })));
        return undefined;
      }

      // TODO(burdon): Handle tie-break if multiple messages.
      return next[0]?.i;
    };

    const feedSelector: FeedSelector = descriptor => feeds.has(PublicKey.from(descriptor.key));
    const readStream = await createIterator(feedStore, feedSelector, messageSelector);

    //
    // Create feeds.
    //

    const feeds = new ComplexMap<FeedKey, hypercore.Feed>(key => key.toHex());
    for await (const i of Array.from({ length: config.numFeeds }, (_, i) => i + 1)) {
      const feed = await feedStore.openFeed(`feed-${i}`);
      feeds.set(PublicKey.from(feed.key), feed);
    }

    log(JSON.stringify({
      config,
      feeds: Array.from(feeds.keys()).map(feedKey => feedKey.toHex())
    }, undefined, 2));

    //
    // Write messages to feeds.
    // TODO(burdon): Randomly create items.
    //
    for (let i = 0; i < config.numMessages; i++) {
      const feed = chance.pickone(Array.from(feeds.values()));

      // Create timeframe dependency.
      const timeframe = new Timeframe(Array.from(feeds.values())
        .filter(f => f.key !== feed.key && f.length > 0)
        .map(f => [PublicKey.from(f.key), f.length - 1])
      );

      // Create data.
      const word = chance.word();
      const value = { i, word };
      const message = createTestItemMutation(createId(), String(i), word, timeframe);

      // Write data.
      await pify(feed.append.bind(feed))(message);
      log('Write:', keyToString(feed.key), value, timeframe);
    }

    //
    // Consume iterator.
    //
    let j = 0;
    const [counter, updateCounter] = latch(config.numMessages);
    setImmediate(async () => {
      for await (const message of readStream) {
        assert(message.data?.echo?.mutation);

        const { key: feedKey, seq, data: { echo: { itemId, timeframe, mutation } } } = message;
        assert(itemId);
        assert(timeframe);
        assert(mutation);

        const { key, value: word } = schema.getCodecForType('dxos.echo.testing.TestItemMutation').decode(mutation);
        const i = parseInt(key!);
        log('Read:', j, { i, word }, i === j, timeframe);

        // Check order.
        expect(i).toBe(j);

        // Update timeframe for node.
        currentTimeframe = Timeframe.merge(currentTimeframe, new Timeframe([[PublicKey.from(feedKey), seq]]));

        updateCounter();
        j++;
      }
    });

    //
    // Tests
    //
    await counter;

    // Test expected number of messages.
    expect(Array.from(feeds.values())
      .reduce((sum, feed: hypercore.Feed) => sum + feed.length, 0)).toBe(config.numMessages);
  });

  test('skipping initial messages', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: schema.getCodecForType('dxos.echo.testing.TestItemMutation') } });
    await feedStore.open();

    const feed1 = await feedStore.openFeed('feed-1');
    const feed2 = await feedStore.openFeed('feed-2');

    await pify(feed1.append.bind(feed1))({ key: 'feed1', value: '0' });
    await pify(feed1.append.bind(feed1))({ key: 'feed1', value: '1' });
    await pify(feed2.append.bind(feed2))({ key: 'feed2', value: '0' });
    await pify(feed2.append.bind(feed2))({ key: 'feed2', value: '1' });

    const iterator = await createIterator(feedStore, undefined, undefined, new Timeframe([[PublicKey.from(feed1.key), 0]]));

    const [counter, updateCounter] = latch(3);
    const messages: any[] = [];
    setImmediate(async () => {
      for await (const message of iterator) {
        messages.push(message.data);
        updateCounter();
      }
    });
    await counter;

    expect(messages).toHaveLength(3);

    expect(messages).toContainEqual({ key: 'feed1', value: '1' });
    expect(messages).toContainEqual({ key: 'feed2', value: '0' });
    expect(messages).toContainEqual({ key: 'feed2', value: '1' });
  });
});
