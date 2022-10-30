//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { latch, promiseTimeout, sleep, untilError, untilPromise } from '@dxos/async';
import { log } from '@dxos/log';

import { FeedQueue } from './feed-queue';
import { FeedWrapper } from './feed-wrapper';
import { TestItemBuilder } from './testing';

describe('FeedQueue', function () {
  const builder = new TestItemBuilder();
  const factory = builder.createFeedFactory();

  it('opens and closes a queue multiple times', async function () {
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

  it('queue closed while reading', async function () {
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

  it('feed closed while reading', async function () {
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

  it('responds immediately when feed is appended', async function () {
    const key = await builder.keyring.createKey();
    const feed = new FeedWrapper(factory.createFeed(key, { writable: true }), key);
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

        const next = await promiseTimeout(queue.pop(), 500);
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
          count: numBlocks
        });
        expect(feed.properties.length).to.eq(numBlocks);
        expect(queue.length).to.eq(numBlocks);
      }, 100); // Make sure reader waits.
    }

    await done();
    expect(queue.isOpen).to.be.true;
    await queue.close();
    expect(queue.isOpen).to.be.false;
  }).timeout(1000);

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
      await builder.generator.writeBlocks(feed.createFeedWriter(), {
        count: numBlocks
      });
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
