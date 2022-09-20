//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import faker from 'faker';
import assert from 'node:assert';
import pify from 'pify';

import { latch } from '@dxos/async';
import { createId, createKeyPair } from '@dxos/crypto';
import { FeedStore, HypercoreFeed } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { Timeframe, schema } from '@dxos/protocols';
import { FeedBlock } from '@dxos/protocols/dist/src/types';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { ComplexMap } from '@dxos/util';

import { createTestItemMutation } from '../../../../common/protocols/src/testing';
import { FeedSelector, FeedStoreIterator } from './feed-store-iterator';

const codec = schema.getCodecForType('dxos.echo.feed.FeedMessage');

const log = debug('dxos:echo:feed-store-iterator:test');

faker.seed(1);

describe('feed store iterator', () => {
  test('message order', async () => {
    const config = {
      numFeeds: 2,
      numMessages: 10
    };

    const feedStore = new FeedStore(createStorage({ type: StorageType.RAM })
      .createDirectory('feed'), { valueEncoding: codec });

    //
    // Create the ordered feed stream.
    //

    // Update when processed downstream.
    const currentTimeframe = new Timeframe();

    // TODO(burdon): Factor out/generalize.
    // Select message based on timeframe.
    const messageSelector = (candidates: FeedBlock[]) => {
      log('Current:', currentTimeframe);

      // Create list of allowed candidates.
      const next = candidates.map((candidate, i) => {
        assert(candidate.data?.timeframe);
        const { data: { timeframe } } = candidate;
        const dependencies = Timeframe.dependencies(timeframe, currentTimeframe);
        if (!dependencies.isEmpty()) {
          return undefined;
        }

        return { i, candidate };
      }).filter(Boolean);

      // TODO(burdon): Create test for this (eg, feed with depedencies hasn't synced yet).
      if (!next.length) {
        log('Waiting for dependencies...', candidates.map((candidate, i) => ({
          i, timeframe: candidate?.data?.timeframe
        })));
        return undefined;
      }

      // TODO(burdon): Handle tie-break if multiple messages.
      return next[0]?.i;
    };

    const feedSelector: FeedSelector = descriptor => feeds.has(PublicKey.from(descriptor.key));
    const iterator = new FeedStoreIterator(feedSelector, messageSelector, new Timeframe());

    //
    // Create feeds.
    //

    const feeds = new ComplexMap<PublicKey, HypercoreFeed>(key => key.toHex());
    await Promise.all(Array.from({ length: config.numFeeds }, (_, i) => i + 1).map(async () => {
      const { publicKey, secretKey } = createKeyPair();
      const descriptor = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
      const feed = descriptor.feed;
      feeds.set(PublicKey.from(feed.key), feed);
      iterator.addFeedDescriptor(descriptor);
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
      log('Write:', PublicKey.stringify(feed.key), value, timeframe);
    }

  });

  test('skipping initial messages', async () => {
    const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory('feed'), {
      valueEncoding: schema.getCodecForType('example.testing.data.TestItemMutation')
    });

    const [keyPair1, keyPair2] = [createKeyPair(), createKeyPair()];
    const descriptor1 = await feedStore.openReadWriteFeed(PublicKey.from(keyPair1.publicKey), keyPair1.secretKey);
    const descriptor2 = await feedStore.openReadWriteFeed(PublicKey.from(keyPair2.publicKey), keyPair2.secretKey);

    const feed1 = descriptor1.feed; const feed2 = descriptor2.feed;

    await pify(feed1.append.bind(feed1))({ key: 'feed1', value: '0' });
    await pify(feed1.append.bind(feed1))({ key: 'feed1', value: '1' });
    await pify(feed2.append.bind(feed2))({ key: 'feed2', value: '0' });
    await pify(feed2.append.bind(feed2))({ key: 'feed2', value: '1' });

    const timeframe = new Timeframe([[PublicKey.from(feed1.key), 0]]);
    const iterator = new FeedStoreIterator(() => true, () => 0, timeframe);
    iterator.addFeedDescriptor(descriptor1);
    iterator.addFeedDescriptor(descriptor2);

    const [counter, updateCounter] = latch({ count: 3 });
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
