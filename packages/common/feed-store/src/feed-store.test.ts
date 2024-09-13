//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { TestItemBuilder } from './testing';

describe('FeedStore', () => {
  test('creates feeds', async () => {
    const builder = new TestItemBuilder();
    const feedStore = builder.createFeedStore();

    const numFeeds = 5;
    const feedKeys = await Promise.all(
      Array.from(Array(numFeeds)).map(async () => {
        const feedKey = PublicKey.random();
        await feedStore.openFeed(feedKey);
        return feedKey;
      }),
    );

    {
      for (const feedKey of feedKeys) {
        const feed = feedStore.getFeed(feedKey)!;
        expect(feed.key).to.eq(feedKey);
        expect(feed.properties.opened).to.be.true;
        expect(feed.properties.readable).to.be.true;
        expect(feed.properties.writable).to.be.false;
      }

      expect(feedStore.size).to.eq(feedKeys.length);
    }

    {
      await feedStore.close();
      expect(feedStore.size).to.eq(0);
    }
  });

  test('gets an opened feed', async () => {
    const builder = new TestItemBuilder();
    const feedStore = builder.createFeedStore();
    const feedKey = PublicKey.random();

    {
      const feed = await feedStore.openFeed(feedKey);
      expect(feed.key).to.eq(feedKey);
      expect(feed.properties.writable).to.be.false;
      expect(feedStore.size).to.eq(1);
    }

    {
      const feed = await feedStore.openFeed(feedKey);
      expect(feed.key).to.eq(feedKey);
      expect(feed.properties.writable).to.be.false;
      expect(feedStore.size).to.eq(1);
    }
  });

  test('tries to open an existing readable feed as writable', async () => {
    const builder = new TestItemBuilder();
    const feedStore = builder.createFeedStore();
    const feedKey = PublicKey.random();

    {
      const feed = await feedStore.openFeed(feedKey);
      expect(feed.key).to.eq(feedKey);
      expect(feed.properties.writable).to.be.false;
      expect(feedStore.size).to.eq(1);
    }

    // Attempt to reopen as writable (fail).
    {
      await expect(feedStore.openFeed(feedKey, { writable: true })).rejects.toThrow();
    }
  });
});
