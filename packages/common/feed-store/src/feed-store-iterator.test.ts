//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { latch, sleep } from '@dxos/async';
import { Timeframe } from '@dxos/protocols';

import { FeedBlock, FeedBlockSelector, FeedSelector, FeedStoreIterator } from './feed-store-iterator';
import { FeedWrapper } from './feed-wrapper';
import { TestBuilder } from './testing';

describe('FeedStoreIterator', function () {
  it('Reads blocks in order.', async function () {
    const builder = new TestBuilder();
    const timeframe = new Timeframe();

    // TODO(burdon): Round-robin selector.
    const feedSelector: FeedSelector = (feed: FeedWrapper) => false;
    const feedBlockSelector: FeedBlockSelector<any> = (feeds: FeedBlock<any>[]) => undefined;
    const iterator = new FeedStoreIterator(feedSelector, feedBlockSelector, timeframe);

    // Write data.
    const numBlocks = 10;
    {
      const feedStore = builder.createFeedStore();
      const key = await builder.keyring.createKey();
      const feed = await feedStore.openFeed(key, { writable: true });
      iterator.addFeed(feed);

      for (const _ of Array.from(Array(numBlocks))) {
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
          console.log(block);
          inc();

          // TODO(burdon): Separate generator to add data to feed.
          await sleep(faker.datatype.number({ min: 0, max: 20 }));
        }
      });

      const count = await done();
      expect(count).to.eq(10);
    }

    iterator.stop();
    expect(iterator.running).to.be.false;
  }).timeout(5_000);
});
