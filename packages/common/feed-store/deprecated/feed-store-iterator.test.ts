//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import faker from 'faker';
import assert from 'node:assert';

import { latch } from '@dxos/async';
import { createId } from '@dxos/crypto';
import { FeedBlock } from '@dxos/hypercore';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { schema, createTestItemMutation } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';
import { ComplexMap } from '@dxos/util';

import { FeedDescriptor } from './feed-descriptor';
import { FeedStore } from './feed-store';
import { FeedSelector, FeedStoreIterator } from './feed-store-iterator';

const codec = schema.getCodecForType('dxos.echo.feed.FeedMessage');

const log = debug('dxos:echo:feed-store-iterator:test');

faker.seed(1);

describe('feed store iterator', function () {
  it('message order', async function () {
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

    const feeds = new ComplexMap<PublicKey, FeedDescriptor>(PublicKey.hash);
    await Promise.all(Array.from({ length: config.numFeeds }, (_, i) => i + 1).map(async () => {
      const keyring = new Keyring();
      const descriptor = await feedStore.openReadWriteFeedWithSigner(await keyring.createKey(), keyring);
      feeds.set(PublicKey.from(descriptor.key), descriptor);
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
      await feed.append(message);
      log('Write:', feed.key.toHex(), value, timeframe);
    }
  });

  it.skip('skipping initial messages', async function () {
    const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory('feed'), {
      valueEncoding: schema.getCodecForType('example.testing.data.TestItemMutation')
    });

    const keyring = new Keyring();
    const feed1 = await feedStore.openReadWriteFeedWithSigner(await keyring.createKey(), keyring);
    const feed2 = await feedStore.openReadWriteFeedWithSigner(await keyring.createKey(), keyring);

    await feed1.append({ key: 'feed1', value: '0' });
    await feed1.append({ key: 'feed1', value: '1' });
    await feed2.append({ key: 'feed2', value: '0' });
    await feed2.append({ key: 'feed2', value: '1' });

    const timeframe = new Timeframe([[PublicKey.from(feed1.key), 0]]);
    const iterator = new FeedStoreIterator(() => true, () => 0, timeframe);
    iterator.addFeedDescriptor(feed1);
    iterator.addFeedDescriptor(feed1);

    const [done, updateCounter] = latch({ count: 3 });
    const messages: any[] = [];
    setTimeout(async () => {
      for await (const message of iterator) {
        messages.push(message.data);
        updateCounter();
      }
    });

    await done();
    await iterator.close();
    await feedStore.close();

    expect(messages).toHaveLength(3);

    expect(messages).toContainEqual({ key: 'feed1', value: '1' });
    expect(messages).toContainEqual({ key: 'feed2', value: '0' });
    expect(messages).toContainEqual({ key: 'feed2', value: '1' });
  });
});
