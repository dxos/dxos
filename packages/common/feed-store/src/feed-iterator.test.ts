//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { latch } from '@dxos/async';

import { FeedIterator } from './feed-iterator';
import { TestBuilder } from './testing';

describe('FeedIterator', function () {
  it('reads blocks in order', async function () {
    const builder = new TestBuilder();

    const numBlocks = 20;

    // Create feeds and write data.
    const feedStore = builder.createFeedStore();
    const key = await builder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });

    const iterator = new FeedIterator(feed);
    await iterator.start();
    expect(iterator.running).to.be.true;

    // Write blocks.
    {
      // TODO(burdon): Do async to test race conditions.
      for (const i of Array.from(Array(numBlocks)).keys()) {
        await feed.append(faker.lorem.sentence());
        console.log(i);
      }
    }

    // Read blocks.
    {
      const [done, inc] = latch({ count: numBlocks });
      setTimeout(async () => {
        for await (const block of iterator) {
          const count = inc();
          console.log('====', count, block);
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
