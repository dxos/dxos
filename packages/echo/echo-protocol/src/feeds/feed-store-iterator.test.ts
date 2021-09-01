//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import faker from 'faker';
import pify from 'pify';

import { latch } from '@dxos/async';
import { createId, createKeyPair, keyToString, PublicKey } from '@dxos/crypto';
import { FeedStore, HypercoreFeed } from '@dxos/feed-store';
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';
import { ComplexMap } from '@dxos/util';

import { codec, createTestItemMutation, schema } from '../proto';
import { Timeframe } from '../spacetime';
import { FeedBlock, FeedKey } from '../types';
import { createIterator, FeedSelector } from './feed-store-iterator';

const log = debug('dxos:echo:feed-store-iterator:test');
debug.enable('dxos:echo:*');

faker.seed(1);

describe('feed store iterator', () => {
  test('message order', async () => {
    const config = {
      numFeeds: 2,
      numMessages: 10
    };

    const feedStore = new FeedStore(createStorage('', STORAGE_RAM), { feedOptions: { valueEncoding: codec } });
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
          return undefined;
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
    const iterator = await createIterator(feedStore, feedSelector, messageSelector);

    //
    // Create feeds.
    //

    const feeds = new ComplexMap<FeedKey, HypercoreFeed>(key => key.toHex());
    await Promise.all(Array.from({ length: config.numFeeds }, (_, i) => i + 1).map(async () => {
      const { publicKey, secretKey } = createKeyPair();
      const feed = await feedStore.createReadWriteFeed({ key: PublicKey.from(publicKey), secretKey });
      feeds.set(PublicKey.from(feed.key), feed);
    }));

    log(JSON.stringify({
      config,
      feeds: Array.from(feeds.keys()).map(feedKey => feedKey.toHex())
    }, undefined, 2));

    //
    // Write messages to feeds.
    // TODO(burdon): Randomly create items.
    //
    for (let i = 0; i < config.numMessages; i++) {
      const feed = faker.random.arrayElement(Array.from(feeds.values()));

      // Create timeframe dependency.
      const timeframe = new Timeframe(Array.from(feeds.values())
        .filter(f => f.key !== feed.key && f.length > 0)
        .map(f => [PublicKey.from(f.key), f.length - 1])
      );

      // Create data.
      const word = faker.lorem.word();
      const value = { i, word };
      const message = createTestItemMutation(createId(), String(i), word, timeframe);

      // Write data.
      await pify(feed.append.bind(feed))(message);
      log('Write:', keyToString(feed.key), value, timeframe);
    }

    return;

    //
    // Consume iterator.
    //
    let j = 0;
    const [counter, updateCounter] = latch(config.numMessages);
    setImmediate(async () => {
      for await (const message of iterator) {
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

    await counter;
    await iterator.close();
    await feedStore.close();

    // Test expected number of messages.
    expect(Array.from(feeds.values())
      .reduce((sum, feed: HypercoreFeed) => sum + feed.length, 0)).toBe(config.numMessages);
  });

  test('skipping initial messages', async () => {
    const feedStore = new FeedStore(createStorage('', STORAGE_RAM), {
      feedOptions: {
        valueEncoding: schema.getCodecForType('dxos.echo.testing.TestItemMutation')
      }
    });

    await feedStore.open();

    const [keyPair1, keyPair2] = [createKeyPair(), createKeyPair()];
    const feed1 = await feedStore.createReadWriteFeed({ key: PublicKey.from(keyPair1.publicKey), secretKey: keyPair1.secretKey });
    const feed2 = await feedStore.createReadWriteFeed({ key: PublicKey.from(keyPair2.publicKey), secretKey: keyPair2.secretKey });

    await pify(feed1.append.bind(feed1))({ key: 'feed1', value: '0' });
    await pify(feed1.append.bind(feed1))({ key: 'feed1', value: '1' });
    await pify(feed2.append.bind(feed2))({ key: 'feed2', value: '0' });
    await pify(feed2.append.bind(feed2))({ key: 'feed2', value: '1' });

    const timeframe = new Timeframe([[PublicKey.from(feed1.key), 0]]);
    const iterator = await createIterator(feedStore, undefined, undefined, timeframe);

    const [counter, updateCounter] = latch(3);
    const messages: any[] = [];
    setImmediate(async () => {
      for await (const message of iterator) {
        messages.push(message.data);
        updateCounter();
      }
    });

    await counter;
    await iterator.close();
    await feedStore.close();

    expect(messages).toHaveLength(3);

    expect(messages).toContainEqual({ key: 'feed1', value: '1' });
    expect(messages).toContainEqual({ key: 'feed2', value: '0' });
    expect(messages).toContainEqual({ key: 'feed2', value: '1' });
  });
});
