//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { latch } from '@dxos/async';
import { FeedBlock } from '@dxos/hypercore';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { FeedBlockSelector, FeedSetIterator } from './feed-set-iterator';
import { FeedWriter } from './feed-writer';
import { defaultTestGenerator, defaultValueEncoding, TestBuilder } from './testing';

describe('FeedSetIterator', function () {
  it('reads blocks in order', async function () {
    const builder = new TestBuilder({
      valueEncoding: defaultValueEncoding,
      generator: defaultTestGenerator
    });

    // Random selector.
    // TODO(burdon): Implement Timeframe (index) selector.
    const feedBlockSelector: FeedBlockSelector<any> = (blocks: FeedBlock<any>[]) =>
      faker.datatype.number({ min: 0, max: blocks.length - 1 });

    // TODO(burdon): Test with starting index.
    const iterator = new FeedSetIterator(feedBlockSelector);

    const numFeeds = 3;
    const numBlocks = 25;

    // Write blocks.
    const feedKeys: PublicKey[] = [];
    {
      const feedStore = builder.createFeedStore();

      // Create feeds.
      // TODO(burdon): Test adding feeds on-the-fly.
      log('writing', { numFeeds, numBlocks });
      const writers = await Promise.all(Array.from(Array(numFeeds)).map(async () => {
        const key = await builder.keyring.createKey();
        const feed = await feedStore.openFeed(key, { writable: true });
        iterator.addFeed(feed);
        feedKeys.push(feed.key);
        return new FeedWriter(feed.core);
      }));

      expect(iterator.size).to.eq(numFeeds);

      // Write blocks.
      setTimeout(async () => {
        for (const _ of Array.from(Array(numBlocks))) {
          const writer = faker.random.arrayElement(writers);
          await builder.generator.writeBlocks(writer, { count: 1 });
        }
      });
    }

    await iterator.start();
    expect(iterator.running).to.be.true;

    // Read blocks.
    {
      const [done, inc] = latch({ count: numBlocks });
      setTimeout(async () => {
        for await (const block of iterator) {
          const { key, seq } = block;
          const feedIndex = feedKeys.findIndex(feedKey => PublicKey.equals(feedKey, key));
          log('read', { feedIndex, seq });

          const count = inc();
          if (count === numBlocks) {
            await iterator.stop();
          }
        }
      });

      const count = await done();
      expect(count).to.eq(numBlocks);
    }

    expect(iterator.running).to.be.false;
  }).timeout(5_000);
});
