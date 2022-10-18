//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { latch, promiseTimeout } from '@dxos/async';

import { FeedQueue } from './feed-queue';
import { FeedWrapper } from './feed-wrapper';
import { createFeedWriter } from './feed-writer';
import { TestItemBuilder } from './testing';

describe.only('FeedQueue', function () {
  const builder = new TestItemBuilder();
  const factory = builder.createFeedFactory();

  it('responds immediately when feed is appended', async function () {
    const key = await builder.keyring.createKey();
    const feed = new FeedWrapper(factory.createFeed(key, { writable: true }), key);
    await feed.open();

    const queue = new FeedQueue<any>(feed);
    await queue.open();

    const numBlocks = 10;
    const [done, received] = latch({ count: numBlocks });

    {
      // Read blocks.
      setTimeout(async () => {
        expect(queue.peek()).to.be.undefined;
        expect(queue.length).to.eq(0);
        expect(feed.properties.length).to.eq(0);

        const next = await promiseTimeout(queue.pop(), 500);
        expect(next).not.to.be.undefined;
        received();

        // Check called immediately (i.e., after first block is written).
        expect(queue.length).to.eq(1);
        expect(feed.properties.length).to.eq(1);

        for await (const _ of Array.from(Array(numBlocks - 1))) {
          await queue.pop();
          const i = received();
          expect(i).to.eq(queue.index);
        }
      });

      // Write blocks.
      setTimeout(async () => {
        await builder.generator.writeBlocks(createFeedWriter(feed), { count: numBlocks });
        expect(feed.properties.length).to.eq(numBlocks);
        expect(queue.length).to.eq(numBlocks);
      }, 100); // Make sure reader waits.
    }

    await done();
    await queue.close();
  });

  it('peeks ahead', async function () {
    const key = await builder.keyring.createKey();
    const feed = new FeedWrapper(factory.createFeed(key, { writable: true }), key);
    await feed.open();

    const queue = new FeedQueue<any>(feed);
    await queue.open();

    const numBlocks = 10;
    const [done, received] = latch({ count: numBlocks });

    {
      // Write blocks.
      await builder.generator.writeBlocks(createFeedWriter(feed), { count: numBlocks });
      expect(feed.properties.length).to.eq(numBlocks);
      expect(queue.length).to.eq(numBlocks);

      // Peek and read first block.
      const peek = queue.peek();
      const next = await queue.pop();
      received();
      expect(peek).to.eq(next);
      expect(queue.index).to.eq(1);
      expect(queue.length).to.eq(numBlocks);
      expect(feed.properties.length).to.eq(numBlocks);

      // Read the rest.
      for await (const _ of Array.from(Array(numBlocks - 1))) {
        await queue.pop();
        const i = received();
        expect(i).to.eq(queue.index);
      }
    }

    await done();
    await queue.close();
  });
});
