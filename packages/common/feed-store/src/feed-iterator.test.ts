//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { latch } from '@dxos/async';

import { FeedIterator } from './feed-iterator';
import { TestItemBuilder } from './testing';

describe('FeedIterator', function () {
  it('reads blocks in order', async function () {
    const builder = new TestItemBuilder();

    const numBlocks = 20;

    // Create feeds and write data.
    const feedStore = builder.createFeedStore();
    const key = await builder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });
    const writer = feed.createFeedWriter();

    const iterator = new FeedIterator(feed);
    await iterator.start();
    expect(iterator.running).to.be.true;

    // Write blocks.
    {
      setTimeout(async () => {
        for (const _ of Array.from(Array(numBlocks)).keys()) {
          await builder.generator.writeBlocks(writer, { count: 1 });
        }

        expect(feed.properties.length).to.eq(numBlocks);
      });
    }

    // Read blocks.
    {
      const [done, inc] = latch({ count: numBlocks });
      setTimeout(async () => {
        for await (const _ of iterator) {
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
