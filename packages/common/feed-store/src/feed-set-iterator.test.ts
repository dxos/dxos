//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { latch, sleep } from '@dxos/async';
import { Timeframe } from '@dxos/protocols';

import { FeedBlock } from './feed-queue';
import { FeedBlockSelector, FeedSetIterator } from './feed-set-iterator';
import { defaultTestGenerator, defaultValueEncoding, TestBuilder } from './testing';

describe('FeedSetIterator', function () {
  it('reads blocks in order', async function () {
    const builder = new TestBuilder({
      valueEncoding: defaultValueEncoding,
      generator: defaultTestGenerator
    });

    const timeframe = new Timeframe();

    // TODO(burdon): Round-robin selector.
    const feedBlockSelector: FeedBlockSelector<any> = (feeds: FeedBlock<any>[]) => undefined;

    const iterator = new FeedSetIterator(feedBlockSelector, timeframe);

    const numFeeds = 3;
    const numBlocks = 25;

    // Write blocks.
    {
      // Create feeds.
      // TODO(burdon): Test adding feeds on-the-fly.
      const feedStore = builder.createFeedStore();
      const feeds = await Promise.all(Array.from(Array(numFeeds)).map(async () => {
        const key = await builder.keyring.createKey();
        const feed = await feedStore.openFeed(key, { writable: true });
        iterator.addFeed(feed);
        return feed;
      }));

      expect(iterator.size).to.eq(numFeeds);

      // Write blocks.
      for (const _ of Array.from(Array(numBlocks))) {
        const feed = faker.random.arrayElement(feeds);
        await feed.append(faker.lorem.sentence());
        await sleep(faker.datatype.number({ min: 0, max: 20 }));
      }
    }

    await iterator.start();
    expect(iterator.running).to.be.true;

    // Read blocks.
    {
      const [done, inc] = latch({ count: numBlocks });
      setTimeout(async () => {
        for await (const block of iterator) {
          console.log(block);
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
