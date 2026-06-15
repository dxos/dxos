//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { asyncTimeout, latch, sleep, untilError, untilPromise } from '@dxos/async';
import { log } from '@dxos/log';
import { range } from '@dxos/util';

import { FeedQueue } from './feed-queue';
import { TestItemBuilder } from './testing';

describe('FeedQueue', () => {
  const builder = new TestItemBuilder();
  const factory = builder.createFeedFactory();

  test('opens and closes a queue multiple times', async () => {
    const feedStore = builder.createFeedStore();
    const key = await builder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });

    const queue = new FeedQueue(feed);
    await queue.open();
    await queue.open();

    await queue.close();
    await queue.close();

    // await feedStore.close();
  });

  test('queue closed while reading', async () => {
    const feedStore = builder.createFeedStore();
    const key = await builder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });

    const queue = new FeedQueue<any>(feed);
    await queue.open();

    expect(queue.isOpen).to.be.true;
    expect(queue.feed.properties.closed).to.be.false;

    // Write blocks.
    // TODO(burdon): Write slowly to test writing close feed.
    await builder.generator.writeBlocks(feed.createFeedWriter(), { count: 10 });

    // Read until queue closed (pop throws exception).
    const errorPromise = untilError(async () => {
      while (true) {
        const next = await queue.pop();
        log('next', { next: next.seq });
        await sleep(50);
      }
    });

    // Close the queue.
    await untilPromise(async () => {
      await sleep(400);
      await queue.close();
    });

    // Expect pop to throw error when queue is closed.
    await errorPromise;

    expect(queue.isOpen).to.be.false;
    expect(queue.feed.properties.closed).to.be.false;
  });

  test('feed closed while reading', async () => {
    const feedStore = builder.createFeedStore();
    const key = await builder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });

    const queue = new FeedQueue<any>(feed);
    await queue.open();

    expect(queue.isOpen).to.be.true;
    expect(queue.feed.properties.closed).to.be.false;

    // Write blocks.
    // TODO(burdon): Write slowly to test writing close feed.
    await builder.generator.writeBlocks(feed.createFeedWriter(), { count: 10 });

    // Read until queue closed (pop throws exception).
    const errorPromise = untilError(async () => {
      while (true) {
        const next = await queue.pop();
        log('next', { next: next.seq });
        await sleep(50);
      }
    });

    // Close the feed.
    await untilPromise(async () => {
      await sleep(400);
      await feedStore.close();
    });

    // Expect pop to throw error when queue is closed.
    await errorPromise;

    expect(queue.isOpen).to.be.false;
    expect(queue.feed.properties.closed).to.be.true;
  });

  // TODO(dmaretskyi): Fix.
  test.skip('responds immediately when feed is appended', async () => {
    const key = await builder.keyring.createKey();
    const feed = await factory.createFeed(key, { writable: true });
    await feed.open();

    const queue = new FeedQueue<any>(feed);
    await queue.open();
    expect(queue.isOpen).to.be.true;

    const numBlocks = 10;
    const [done, received] = latch({ count: numBlocks });

    {
      // Read blocks.
      setTimeout(async () => {
        expect(queue.peek()).to.be.undefined;
        expect(queue.length).to.eq(0);
        expect(feed.properties.length).to.eq(0);

        const next = await asyncTimeout(queue.pop(), 500);
        expect(next).not.to.be.undefined;
        received();

        // Check called immediately (i.e., after first block is written).
        expect(queue.length).to.eq(1);
        expect(feed.properties.length).to.eq(1);

        for await (const _ of Array.from(Array(numBlocks - 1))) {
          const next = await queue.pop();
          expect(next).not.to.be.undefined;
          const i = received();
          expect(i).to.eq(queue.index);
        }
      });

      // Write blocks.
      setTimeout(async () => {
        await builder.generator.writeBlocks(feed.createFeedWriter(), {
          count: numBlocks,
        });
        expect(feed.properties.length).to.eq(numBlocks);
        expect(queue.length).to.eq(numBlocks);
      }, 100); // Make sure reader waits.
    }

    await done();
    expect(queue.isOpen).to.be.true;
    await queue.close();
    expect(queue.isOpen).to.be.false;
  });

  test('peeks ahead', async () => {
    const key = await builder.keyring.createKey();
    const feed = await factory.createFeed(key, { writable: true });
    await feed.open();

    const queue = new FeedQueue<any>(feed);
    await queue.open();

    const numBlocks = 10;
    const [done, received] = latch({ count: numBlocks });

    {
      const updatedPromise = queue.updated.waitForCount(1);
      // Write blocks.
      await builder.generator.writeBlocks(feed.createFeedWriter(), {
        count: numBlocks,
      });
      expect(feed.properties.length).to.eq(numBlocks);
      expect(queue.length).to.eq(numBlocks);

      // Peek and read first block.
      await updatedPromise;
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

  test('set a start sequence', { timeout: 1000 }, async () => {
    const numBlocks = 10;
    const start = 2;

    const key = await builder.keyring.createKey();
    const feed = await factory.createFeed(key, { writable: true });
    await feed.open();

    // Write blocks.
    await builder.generator.writeBlocks(feed.createFeedWriter(), {
      count: numBlocks,
    });
    expect(feed.properties.length).to.eq(numBlocks);

    const queue = new FeedQueue<any>(feed);
    await queue.open({ start });
    expect(queue.isOpen).to.be.true;

    const collectedIndexes = [];
    while (true) {
      const next = await queue.pop();
      expect(next).not.to.be.undefined;
      collectedIndexes.push(next.seq);
      if (next.seq === feed.length - 1) {
        break;
      }
    }

    expect(collectedIndexes).to.deep.eq(range(numBlocks).slice(2));

    expect(queue.isOpen).to.be.true;
    await queue.close();
    expect(queue.isOpen).to.be.false;
  });
});
