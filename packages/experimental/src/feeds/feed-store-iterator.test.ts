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
import { FeedStore } from '@dxos/feed-store';

import { codec } from '../proto';
import { FeedKeyMapper, Spacetime } from '../spacetime';
import { createAppendPropertyMutation } from '../testing';
import { createWritable, latch } from '../util';
import { createOrderedFeedStream } from './feed-store-iterator';
import { IFeedBlock } from './types';

const chance = new Chance(999);

const log = debug('dxos:echo:feed-store-iterator:test');
debug.enable('dxos:echo:*');

describe('feed store iterator', () => {
  test('test message order', async () => {
    const config = {
      numFeeds: 5,
      numMessages: 50
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
    const messageSelector = (candidates: IFeedBlock[]) => {
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

    const readStream = await createOrderedFeedStream(feedStore, () => true, messageSelector);

    //
    // Create feeds.
    //

    const feeds = new Map<string, hypercore.Feed>();
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
      const message = createAppendPropertyMutation(createId(), 'value', JSON.stringify(value), timeframe);

      // Write data.
      await pify(feed.append.bind(feed))(message);
      log('Write:', keyToString(feed.key), value, spacetime.stringify(timeframe));
    }

    //
    // Consume iterator.
    //
    let j = 0;
    const [counter, updateCounter] = latch(config.numMessages);
    const writeStream = createWritable<IFeedBlock>(async message => {
      assert(message.data?.echo?.itemMutation?.append?.value);
      const { key: feedKey, seq, data: { echo: { timeframe, itemMutation: { append: { value } } } } } = message;
      assert(timeframe);
      const { i, word } = JSON.parse(value);
      log('Read:', j, { i, word }, i === j, spacetime.stringify(timeframe));

      // Check order.
      expect(i).toBe(j);

      // Update timeframe for node.
      currentTimeframe = spacetime.merge(currentTimeframe, spacetime.createTimeframe([[feedKey, seq]]));

      updateCounter();
      j++;
    });

    readStream.pipe(writeStream);

    //
    // Tests
    //
    await counter;

    // Test expected number of messages.
    expect(Array.from(feeds.values())
      .reduce((sum, feed: hypercore.Feed) => sum + feed.length, 0)).toBe(config.numMessages);
  });
});
