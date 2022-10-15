//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { latch, sleep } from '@dxos/async';
import { Timeframe } from '@dxos/protocols';

import { FeedBlock, FeedBlockSelector, FeedIterator } from './feed-iterator';
import { TestBuilder } from './testing';

describe('FeedStoreIterator', function () {
  it('reads blocks in order', async function () {
    const builder = new TestBuilder();
    const timeframe = new Timeframe();

    // TODO(burdon): Round-robin selector.
    const feedBlockSelector: FeedBlockSelector<any> = (feeds: FeedBlock<any>[]) => undefined;

    const iterator = new FeedIterator(feedBlockSelector, timeframe);

    const numFeeds = 3;
    const numBlocks = 20;

    // Create feeds and write data.
    {
      // TODO(burdon): Test adding feeds on-the-fly.
      const feedStore = builder.createFeedStore();
      const feeds = await Promise.all(Array.from(Array(numFeeds)).map(async () => {
        const key = await builder.keyring.createKey();
        const feed = await feedStore.openFeed(key, { writable: true });
        iterator.addFeed(feed);
        return feed;
      }));

      for (const _ of Array.from(Array(numBlocks))) {
        const feed = faker.random.arrayElement(feeds);
        await sleep(faker.datatype.number({ min: 0, max: 20 }));
        await feed.append(faker.lorem.sentence());
      }
    }

    iterator.start();
    expect(iterator.running).to.be.true;

    // Read blocks.
    {
      const [done, inc] = latch({ count: numBlocks });
      setTimeout(async () => {
        for await (const block of iterator) {
          // console.log(block);
          const count = inc();
          if (count === numBlocks) {
            iterator.stop();
          }
        }
      });

      const count = await done();
      expect(count).to.eq(numBlocks);
    }

    expect(iterator.running).to.be.false;
  }).timeout(5_000);
});
