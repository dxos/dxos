//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { latch, promiseTimeout, sleep } from '@dxos/async';
import { log } from '@dxos/log';

import { FeedQueue } from './feed-queue';
import { FeedWrapper } from './feed-wrapper';
import { createFeedWriter } from './feed-writer';
import { TestItemBuilder } from './testing';

describe('FeedQueue', function () {
  const builder = new TestItemBuilder();
  const factory = builder.createFeedFactory();

  it.only('responds immediately when feed is appended', async function () {
    const key = await builder.keyring.createKey();
    const feed = new FeedWrapper(factory.createFeed(key, { writable: true }), key);
    await feed.open();

    const queue = new FeedQueue<any>(feed);
    await queue.open();

    const [done, readAll] = latch();

    const numBlocks = 10;

    {
      setTimeout(async () => {
        expect(feed.properties.length).to.eq(0);
        expect(queue.length).to.eq(0);
        const next = await promiseTimeout(queue.pop(), 500);
        expect(next).not.to.be.undefined;

        // Check called immediately (i.e., after first block is written).
        expect(feed.properties.length).to.eq(1);
        expect(queue.length).to.eq(1);

        for await (const _ of Array.from(Array(9))) {
          await queue.pop();
          if (queue.index === numBlocks) {
            readAll();
          }
        }
      });

      setTimeout(async () => {
        await builder.generator.writeBlocks(createFeedWriter(feed), { count: numBlocks });
        expect(feed.properties.length).to.eq(numBlocks);
        expect(queue.length).to.eq(numBlocks);
      }, 100);
    }

    await done();
    await queue.close();
  });

  it('peaks and pops from a queue', async function () {
    const key = await builder.keyring.createKey();
    const feed = new FeedWrapper(factory.createFeed(key, { writable: true }), key);
    await feed.open();

    const start = 5;
    const numBlocks = 25;
    const numChunks = 3;

    // Create queue.
    const queue = new FeedQueue<any>(feed);
    await queue.open({ start });
    expect(queue.opened).to.be.true;

    // Write blocks in batches.
    {
      const writer = createFeedWriter(feed);

      setTimeout(async () => {
        let count = 0;
        const batch = async (n: number) => {
          log(`batch[${n}]`);
          count += await builder.generator.writeBlocks(writer, {
            count: n,
            delay: {
              min: 0,
              max: 100
            }
          });
        };

        const size = Math.floor(numBlocks / numChunks);
        for (const i of Array.from(Array(numChunks)).keys()) {
          const last = i === numChunks - 1;
          await batch(last ? Math.max(size, numBlocks - count) : size);
          if (!last) {
            await sleep(faker.datatype.number({ min: 0, max: 50 }));
          }
        }

        expect(feed.properties.length).to.eq(numBlocks);
      });
    }

    // Read.
    const [receivedAll, received] = latch({ count: numBlocks - start });
    setTimeout(async () => {
      {
        const { seq, data } = await queue.peek();
        expect(seq).to.eq(start);
        expect(data).not.to.be.undefined;
      }

      {
        const { seq, data } = await queue.peek();
        expect(seq).to.eq(start);
        expect(data).not.to.be.undefined;
      }

      {
        const { seq, data } = await queue.pop();
        expect(seq).to.eq(start);
        expect(data).not.to.be.undefined;
        received();
      }

      {
        const { seq, data } = await queue.peek();
        expect(seq).to.eq(start + 1);
        expect(data).not.to.be.undefined;
      }

      // Read until end.
      {
        for (let i = start + 1; i < numBlocks; i++) {
          const { seq, data } = await queue.pop();
          log('<<', { seq, data: JSON.stringify(data) });
          await sleep(faker.datatype.number({ min: 0, max: 50 }));
          received();
        }
      }
    });

    await receivedAll();

    // Close.
    await queue.close();
    expect(queue.opened).to.be.false;
  }).timeout(5_000);
});
