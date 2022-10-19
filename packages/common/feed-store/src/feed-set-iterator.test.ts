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
import { createFeedWriter } from './feed-writer';
import { TestItemBuilder } from './testing';

// Random selector.
const randomFeedBlockSelector: FeedBlockSelector<any> = (blocks: FeedBlock<any>[]) =>
  faker.datatype.number({ min: 0, max: blocks.length - 1 });

describe.only('FeedSetIterator', function () {
  const builder = new TestItemBuilder();

  // TODO(burdon): Create randomized setTimeout to test race conditions.

  // TODO(burdon): Test when feed is added.
  it('responds immediately when a feed is appended', async function () {
    const feedStore = builder.createFeedStore();
    const iterator = new FeedSetIterator(randomFeedBlockSelector);
    await iterator.start();

    const numFeeds = 3;
    const feeds = await Promise.all(Array.from(Array(numFeeds)).map(async () => {
      const key = await builder.keyring.createKey();
      const feed = await feedStore.openFeed(key, { writable: true });
      iterator.addFeed(feed);
      return feed;
    }));

    const [done, received] = latch();

    {
      // Read block.
      setTimeout(async () => {
        for await (const block of iterator) {
          log('received', block);
          received();
        }
      });

      // Write block.
      setTimeout(async () => {
        await builder.generator.writeBlocks(createFeedWriter(faker.random.arrayElement(feeds)));
      }, 10);
    }

    await done();
    await iterator.stop();
    await iterator.close();
  });

  it('reads blocks in order', async function () {
    // TODO(burdon): Test with starting index.
    const iterator = new FeedSetIterator(randomFeedBlockSelector);

    const numFeeds = 1;
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
        return createFeedWriter(feed);
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
