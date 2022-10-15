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
    const numBlocks = 20;
    const key = await builder.keyring.createKey();
    const feed = new FeedWrapper(factory.createFeed(key, { writable: true }), key);
    await feed.open();

    // TODO(burdon): Move codec into iterators.

    // Create queue.
    const start = 3;
    const queue = new FeedQueue<any>(feed);
    await queue.open({ start, live: true });
    expect(queue.opened).to.be.true;

    // TODO(burdon): Blocked when items written async.

    // Write.
    {
      setTimeout(async () => {
        for (const i of Array.from(Array(numBlocks)).keys()) {
          const block = `test-${String(i).padStart(2, '0')}`;
          const seq = await feed.append(block);
          console.log('>>', { block, seq });
          await sleep(faker.datatype.number({ min: 0, max: 20 }));
        }

        expect(feed.properties.length).to.eq(numBlocks);
      });
    }

    // Read.
    const [done, inc] = latch({ count: numBlocks - start });
    setTimeout(async () => {
      expect(queue.seq).to.be.eq(start);

      {
        const block = await queue.peek();
        log('peek', { block: String(block), seq: queue.seq, length: queue.length });
      }

      {
        const block = await queue.peek();
        log('peek', { block: String(block), seq: queue.seq, length: queue.length });
      }

      {
        const block = await queue.pop();
        log('pop', { block: String(block), seq: queue.seq, length: queue.length });
        inc();
      }

      {
        const block = await queue.peek();
        log('peek', { block: String(block), seq: queue.seq, length: queue.length });
      }

      // Read until end.
      {
        expect(queue.seq).to.eq(start + 1);

        const remaining = queue.remaining;
        for (let i = 0; i < remaining; i++) {
          const block = await queue.pop();
          log('pop', { block: String(block), seq: queue.seq, length: queue.length });
          inc();
        }
      }
    });

    await done();
    expect(queue.remaining).to.eq(0);

    // Close.
    await queue.close();
    expect(queue.opened).to.be.false;
  });
});
