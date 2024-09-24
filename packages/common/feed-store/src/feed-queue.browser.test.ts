//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { sleep, untilError, untilPromise } from '@dxos/async';
import { log } from '@dxos/log';
import { StorageType, createStorage } from '@dxos/random-access-storage';

import { FeedQueue } from './feed-queue';
import { TestItemBuilder } from './testing';

describe('FeedQueue', () => {
  const builder = new TestItemBuilder();

  test('works with webfs', async () => {
    const localBuilder = builder.clone().setStorage(createStorage({ type: StorageType.WEBFS }));
    const feedStore = localBuilder.createFeedStore();
    const key = await localBuilder.keyring.createKey();
    const feed = await feedStore.openFeed(key, { writable: true });

    const queue = new FeedQueue<any>(feed);
    await queue.open();

    expect(queue.isOpen).to.be.true;
    expect(queue.feed.properties.closed).to.be.false;

    // Write blocks.
    // TODO(burdon): Write slowly to test writing close feed.
    await localBuilder._properties.generator!.writeBlocks(feed.createFeedWriter(), { count: 10 });

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
});
