//
// Copyright 2019 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';
import ram from 'random-access-memory';

import { py } from '@dxos/async';

import { HypercoreFactory } from './hypercore-factory';
import { createDataItem } from './testing';

describe('HypercoreFactory', function () {
  it('appends to and read from multiple feeds.', async function () {
    const factory = new HypercoreFactory(ram);
    const numFeeds = 10;
    const numBlocks = 100;

    const feeds = await Promise.all(Array.from({ length: numFeeds }).map(async () => {
      const feed = factory.createFeed();
      await feed.open();
      return feed;
    }));

    // Write data.
    {
      const data = Array.from({ length: numBlocks }).map((_, i) => createDataItem(i));
      for await (const datum of data) {
        const feed = faker.random.arrayElement(feeds);
        await py(feed, feed.append)(Buffer.from(JSON.stringify(datum)));
      }
    }

    // Test.
    {
      const total = feeds.reduce((result, feed) => result + feed.length, 0);
      expect(total).to.eq(numBlocks);

      const feed = faker.random.arrayElement(feeds);
      const block1 = await py(feed, feed.head)();
      const block2 = await py(feed, feed.get)(feed.length - 1);
      expect(block1.toString()).to.eq(block2.toString());

      const blocks = await py(feed, feed.getBatch)(0, feed.length);
      expect(blocks.length).to.eq(feed.length);
    }

    await Promise.all(feeds.map(feed => feed.close()));
  });
});
