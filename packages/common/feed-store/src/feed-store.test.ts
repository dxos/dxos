//
// Copyright 2022 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { describe, test } from '@dxos/test';

import { TestItemBuilder } from './testing';

chai.use(chaiAsPromised);

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
      await expect(feedStore.openFeed(feedKey, { writable: true })).to.be.rejected;
    }
  });

  test('reopens a feed and reads data from storage', async () => {
    const builder = new TestItemBuilder();
    const feedKey = await builder.keyring!.createKey();

    const numBlocks = 10;

    const storage = createStorage({ type: StorageType.NODE });

    // Write.
    {
      const feedStore = builder.clone().setStorage(storage).createFeedStore();
      const feed = await feedStore.openFeed(feedKey, { writable: true });

      for (const i of Array.from(Array(numBlocks)).keys()) {
        await feed.append({
          id: String(i),
          value: faker.lorem.sentence(),
        });
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
  }).onlyEnvironments('nodejs'); // NOTE: Must use Node so that data is persistent across invocations.
});
