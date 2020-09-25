//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import Chance from 'chance';
import debug from 'debug';
import hypercore from 'hypercore';
import pify from 'pify';
import ram from 'random-access-memory';

import { createId, keyToString } from '@dxos/crypto';
import { ComplexMap, latch } from '@dxos/experimental-util';
import { FeedStore } from '@dxos/feed-store';

import { codec, createTestItemMutation, protocol } from '../proto';
import { FeedKeyMapper, Spacetime } from '../spacetime';
import { FeedBlock, FeedKey } from '../types';
import { createIterator, FeedSelector } from './feed-store-iterator';

const chance = new Chance(999);

const log = debug('dxos:echo:feed-store-iterator:test');
debug.enable('dxos:echo:*');

describe('feed store iterator', () => {
  test('test message order', async () => {
    const config = {
      numFeeds: 5,
      numMessages: 100
    };

    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();

    //
    // Create the ordered feed stream.
    //

    const spacetime = new Spacetime(new FeedKeyMapper('feedKey'));

    // Update when processed downstream.
    let currentTimeframe = spacetime.createTimeframe();

    // TODO(burdon): Factor out/generalize.
    // Select message based on timeframe.
    const messageSelector = (candidates: FeedBlock[]) => {
      log('Current:', spacetime.stringify(currentTimeframe));

      // Create list of allowed candidates.
      const next = candidates.map((candidate, i) => {
        assert(candidate.data?.echo?.timeframe);
        const { data: { echo: { timeframe } } } = candidate;
        const dependencies = spacetime.dependencies(timeframe, currentTimeframe);
        if (dependencies.frames?.length) {
          return;
        }

        return { i, candidate };
      }).filter(Boolean);

      // TODO(burdon): Create test for this (e.g., feed with depedencies hasn't synced yet).
      if (!next.length) {
        log('Waiting for dependencies...', candidates.map((candidate, i) => ({
          i, timeframe: spacetime.stringify(candidate?.data?.echo?.timeframe)
        })));
        return undefined;
      }

      // TODO(burdon): Handle tie-break if multiple messages.
      return next[0]?.i;
    };

    const feedSelector: FeedSelector = descriptor => feeds.has(descriptor.key);
    const readStream = await createIterator(feedStore, feedSelector, messageSelector);

    //
    // Create feeds.
    //

    const feeds = new ComplexMap<FeedKey, hypercore.Feed>(keyToString);
    for await (const i of Array.from({ length: config.numFeeds }, (_, i) => i + 1)) {
      const feed = await feedStore.openFeed(`feed-${i}`);
      feeds.set(feed.key, feed);
    }

    log(JSON.stringify({
      config,
      feeds: Array.from(feeds.keys()).map(feedKey => keyToString(feedKey))
    }, undefined, 2));

    //
    // Write messages to feeds.
    // TODO(burdon): Randomly create items.
    //
    for (let i = 0; i < config.numMessages; i++) {
      const feed = chance.pickone(Array.from(feeds.values()));

      // Create timeframe dependency.
      const timeframe = spacetime.createTimeframe(Array.from(feeds.values())
        .filter(f => f.key !== feed.key && f.length > 0)
        .map(f => [f.key, f.length - 1])
      );

      // Create data.
      const word = chance.word();
      const value = { i, word };
      const message = createTestItemMutation(createId(), String(i), word, timeframe);

      // Write data.
      await pify(feed.append.bind(feed))(message);
      log('Write:', keyToString(feed.key), value, spacetime.stringify(timeframe));
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

        const { key, value: word } = (mutation as protocol.dxos.echo.testing.ITestItemMutation);
        const i = parseInt(key!);
        log('Read:', j, { i, word }, i === j, spacetime.stringify(timeframe));

        // Check order.
        expect(i).toBe(j);

        // Update timeframe for node.
        currentTimeframe = spacetime.merge(currentTimeframe, spacetime.createTimeframe([[feedKey, seq]]));

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
});
