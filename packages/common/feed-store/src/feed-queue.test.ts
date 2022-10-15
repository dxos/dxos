//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { latch, sleep } from '@dxos/async';
import { log } from '@dxos/log';

import { FeedQueue } from './feed-queue';
import { FeedWrapper } from './feed-wrapper';
import { TestBuilder } from './testing';

describe('FeedQueue', function () {
  const builder = new TestBuilder();
  const factory = builder.createFeedFactory();

  it('peaks and pops from a queue', async function () {
    const key = await builder.keyring.createKey();
    const feed = new FeedWrapper(factory.createFeed(key, { writable: true }), key);
    await feed.open();

    // TODO(burdon): Break into smaller test with stress test.
    // TODO(burdon): Move codec into iterators.

    const start = 5;
    const numBlocks = 31;
    const numChunks = 3;

    // Create queue.
    const queue = new FeedQueue<any>(feed);
    await queue.open({ start });
    expect(queue.opened).to.be.true;

    // Write blocks in batches.
    {
      setTimeout(async () => {
        let count = 0;
        const batch = async (n: number) => {
          console.log(`batch[${n}]`);
          for (const _ of Array.from(Array(n))) {
            const data = `test-${String(++count).padStart(2, '0')}`;
            const seq = await feed.append(data);
            console.log('>>', { seq, data });
            await sleep(faker.datatype.number({ min: 0, max: 100 }));
          }

          return n;
        };

        const size = Math.floor(numBlocks / numChunks);
        for (const i of Array.from(Array(numChunks)).keys()) {
          const last = i === numChunks - 1;
          await batch(last ? Math.max(size, numBlocks - count) : size);
          if (!last) {
            await sleep(faker.datatype.number({ min: 100, max: 500 }));
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
        log('peek', { block: seq, data: String(data) });
      }

      {
        const { seq, data } = await queue.peek();
        log('peek', { block: seq, data: String(data) });
      }

      {
        const { seq, data } = await queue.pop();
        log('pop', { block: seq, data: String(data) });
        received();
      }

      {
        const { seq, data } = await queue.peek();
        log('peek', { block: seq, data: String(data) });
      }

      // Read until end.
      {
        for (let i = start + 1; i < numBlocks; i++) {
          const { seq, data } = await queue.pop();
          console.log('<<', { seq, data: String(data) });
          await sleep(faker.datatype.number({ min: 0, max: 100 }));
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
