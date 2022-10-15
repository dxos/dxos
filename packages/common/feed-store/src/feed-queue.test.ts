//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { latch } from '@dxos/async';

import { FeedQueue } from './feed-queue';
import { FeedWrapper } from './feed-wrapper';
import { TestBuilder } from './testing';

describe('FeedQueue', function () {
  const builder = new TestBuilder();
  const factory = builder.createFeedFactory();

  it('peaks and pops from a queue', async function () {
    const numBlocks = 10;
    const key = await builder.keyring.createKey();
    const feed = new FeedWrapper(factory.createFeed(key, { writable: true }), key);
    await feed.open();

    // TODO(burdon): Move codec into iterators.

    // Create queue.
    const start = 3;
    const queue = new FeedQueue<any>(feed);
    await queue.open({ start, live: true });
    expect(queue.opened).to.be.true;

    // Write.
    {
      for (const i of Array.from(Array(numBlocks)).keys()) {
        const block = `test-${i}`;
        const seq = await feed.append(block);
        console.log('>>', block, seq);
      }

      expect(feed.properties.length).to.eq(numBlocks);
    }

    // Read.
    const [done, inc] = latch({ count: numBlocks - start });
    setTimeout(async () => {
      expect(queue.seq).to.be.eq(start);
      expect(queue.length).to.eq(numBlocks);

      {
        const block = await queue.peek();
        console.log('??', block?.toString(), queue.seq, queue.length);
      }

      {
        const block = await queue.peek();
        console.log('??', block?.toString(), queue.seq, queue.length);
      }

      {
        const block = await queue.pop();
        console.log('??', block?.toString(), queue.seq, queue.length);
        inc();
      }

      {
        const block = await queue.peek();
        console.log('<<', block?.toString(), queue.seq, queue.length);
      }

      // Read until end.
      {
        expect(queue.seq).to.eq(start + 1);

        const remaining = queue.remaining;
        for (let i = 0; i < remaining; i++) {
          const block = await queue.pop();
          console.log('<<', block?.toString(), queue.seq, queue.length);
          inc();
        }
      }
    });

    await done();
    expect(queue.remaining).to.eq(0);

    await queue.close();
    expect(queue.opened).to.be.false;
  });
});
