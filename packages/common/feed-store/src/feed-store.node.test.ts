//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { faker } from '@dxos/random';
import { StorageType, createStorage } from '@dxos/random-access-storage';

import { TestItemBuilder, type TestItem } from './testing';

describe('FeedStore', () => {
  test('reopens a feed and reads data from storage', async () => {
    const builder = new TestItemBuilder();
    const feedKey = await builder.keyring!.createKey();

    const numBlocks = 10;

    // NOTE: Must use Node so that data is persistent across invocations.
    const storage = createStorage({ type: StorageType.NODE });

    // Write.
    {
      const feedStore = builder.clone().setStorage(storage).createFeedStore();
      const feed = await feedStore.openFeed(feedKey, { writable: true });

      for (const i of Array.from(Array(numBlocks)).keys()) {
        await feed.append({
          id: String(i),
          value: faker.lorem.sentence(),
        } as TestItem);
      }

      expect(feed.properties.length).to.eq(numBlocks);
    }

    // Read.
    {
      const feedStore = builder.clone().setStorage(storage).createFeedStore();
      const feed = await feedStore.openFeed(feedKey);
      expect(feed.properties.length).to.eq(numBlocks);
    }

    // Delete.
    {
      await storage.reset();
    }

    // Read (should be empty).
    {
      const feedStore = builder.clone().setStorage(storage).createFeedStore();
      const feed = await feedStore.openFeed(feedKey);
      expect(feed.properties.length).to.eq(0);
    }
  });
});
