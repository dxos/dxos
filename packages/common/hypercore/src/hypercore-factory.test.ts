//
// Copyright 2019 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { createStorage, StorageType } from '@dxos/random-access-storage';

import { HypercoreFactory } from './hypercore-factory';
import { HypercoreFeed } from './hypercore-feed';
import { createDataItem } from './testing';

describe('HypercoreFactory', function () {
  it('appends to and read from multiple feeds.', async function () {
    const directory = createStorage({ type: StorageType.RAM }).createDirectory();
    const factory = new HypercoreFactory((filename) => directory.getOrCreateFile(filename));
    const numFeeds = 10;
    const numBlocks = 100;

    const feeds: HypercoreFeed[] = await Promise.all(Array.from({ length: numFeeds }).map(async () => {
      const feed = factory.create();
      await feed.open();
      return feed;
    }));

    // Write data.
    {
      const data = Array.from({ length: numBlocks }).map((_, i) => createDataItem(i));
      for await (const datum of data) {
        const feed = faker.random.arrayElement(feeds);
        await feed.append(Buffer.from(JSON.stringify(datum)));
      }
    }

    // Test.
    {
      const total = feeds.reduce((result, feed) => result + feed.length, 0);
      expect(total).to.eq(numBlocks);

      const feed = faker.random.arrayElement(feeds);
      const block1 = await feed.head();
      const block2 = await feed.get(feed.length - 1);
      expect(block1.toString()).to.eq(block2.toString());

      const blocks = await feed.getBatch(0, feed.length);
      expect(blocks.length).to.eq(feed.length);
    }

    await Promise.all(feeds.map(feed => feed.close()));
  });
});
