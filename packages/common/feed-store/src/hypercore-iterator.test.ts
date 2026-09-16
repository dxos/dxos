//
// Copyright 2020 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { latch } from '@dxos/async';

import { HypercoreIterator } from './hypercore-iterator.ts';
import { TestItemBuilder } from './testing/index.ts';

describe('HypercoreIterator', () => {
  test('reads blocks in order', async () => {
    const builder = new TestItemBuilder();

    const numBlocks = 20;

    // Create feeds and write data.
    const hypercoreStore = builder.createHypercoreStore();
    const key = await builder.keyring.createKey();
    const feed = await hypercoreStore.openHypercore(key, { writable: true });
    const writer = feed.createHypercoreWriter();

    const iterator = new HypercoreIterator(feed);
    await iterator.open();
    expect(iterator.isRunning).to.be.true;

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
            await iterator.close();
          }
        }
      });

      const count = await done();
      expect(count).to.eq(numBlocks);
    }

    expect(iterator.isRunning).to.be.false;
  });
});
