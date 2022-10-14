//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';
import { Readable } from 'readable-stream'; // TODO(burdon): streamx?

import { latch, sleep } from '@dxos/async';
import { Timeframe } from '@dxos/protocols';

import { FeedBlock, FeedBlockSelector, FeedSelector, FeedStoreIterator } from './feed-store-iterator';
import { FeedWrapper } from './feed-wrapper';
import { TestBuilder } from './testing';

describe('FeedStoreIterator', function () {
  it.skip('Reads blocks from a feed stream.', async function () {
    const builder = new TestBuilder();
    const factory = builder.createFeedFactory();
    const key = await builder.keyring.createKey();
    const feed = factory.createFeed(key, { writable: true });

    const numBlocks = 10;
    for (const _ of Array.from(Array(numBlocks))) {
      await sleep(faker.datatype.number({ min: 0, max: 20 }));
      await feed.append('xxx' + faker.lorem.sentence());
    }

    // TODO(burdon): Avoid cast?
    // TODO(burdon): from2.obj() https://www.npmjs.com/package/from2
    const feedStream: NodeJS.ReadableStream = feed.createReadStream() as any;
    const feedReadable = new Readable({ objectMode: true }).wrap(feedStream);
    const iterator: AsyncIterator<any[]> = feedReadable[Symbol.asyncIterator]();

    const [done, inc] = latch({ count: numBlocks });
    setTimeout(async () => {
      const block = await iterator.next();
      console.log(block);
      // for await (const block of iterator) {
      //   console.log(block);
      // }
      inc();
    });

    await done();
  });

  it('Reads blocks in order.', async function () {
    const builder = new TestBuilder();
    const timeframe = new Timeframe();

    // TODO(burdon): Round-robin selector.
    const feedSelector: FeedSelector = (feed: FeedWrapper) => false;
    const feedBlockSelector: FeedBlockSelector<any> = (feeds: FeedBlock<any>[]) => undefined;

    const iterator = new FeedStoreIterator(feedSelector, feedBlockSelector, timeframe);

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
