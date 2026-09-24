//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { sleep, untilError, waitForCondition } from '@dxos/async';
import { log } from '@dxos/log';
import { StorageType, createStorage } from '@dxos/random-access-storage';

import { HypercoreQueue } from './hypercore-queue.ts';
import { TestItemBuilder } from './testing/index.ts';

describe('HypercoreQueue', () => {
  const builder = new TestItemBuilder();

  test('works with webfs', async () => {
    const localBuilder = builder.clone().setStorage(createStorage({ type: StorageType.WEBFS }));
    const hypercoreStore = localBuilder.createHypercoreStore();
    const key = await localBuilder.keyring.createKey();
    const feed = await hypercoreStore.openHypercore(key, { writable: true });

    const queue = new HypercoreQueue<any>(feed);
    await queue.open();

    expect(queue.isOpen).to.be.true;
    expect(queue.feed.properties.closed).to.be.false;

    // Write blocks.
    const numBlocks = 10;
    // TODO(burdon): Write slowly to test writing close feed.
    await localBuilder._properties.generator!.writeBlocks(feed.createHypercoreWriter(), { count: numBlocks });

    // Read until queue closed (pop throws exception).
    const errorPromise = untilError(async () => {
      while (true) {
        const next = await queue.pop();
        log('next', { next: next.seq });
        await sleep(50);
      }
    });

    // Close the queue once the reader has drained all pre-written blocks.
    await waitForCondition({ condition: () => queue.index === numBlocks });
    await queue.close();

    // Expect pop to throw error when queue is closed.
    await errorPromise;

    expect(queue.isOpen).to.be.false;
    expect(queue.feed.properties.closed).to.be.false;
  });
});
