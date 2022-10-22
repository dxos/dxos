//
// Copyright 2022 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import faker from 'faker';

import { PublicKey } from '@dxos/keys';
import { StorageType } from '@dxos/random-access-storage';

import { TestItemBuilder } from './testing';

chai.use(chaiAsPromised);

describe('FeedStore', function () {
  it('creates feeds', async function () {
    const builder = new TestItemBuilder();
    const feedStore = builder.createFeedStore();

    const feedKeys = await Promise.all(Array.from(Array(10)).map(async () => {
      const feedKey = PublicKey.random();
      await feedStore.openFeed(feedKey);
      return feedKey;
    }));

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

  it('gets an opened feed', async function () {
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

  it('tries to open an existing readable feed as writable', async function () {
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

  it('reopens a feed and reads data from storage', async function () {
    if (mochaExecutor.environment !== 'nodejs') {
      this.skip();
    }

    const builder = new TestItemBuilder();
    const feedKey = await builder.keyring!.createKey();

    const numBlocks = 10;

    // Write.
    // NOTE: Node is required to make this persistent across invocations.
    {
      const feedStore = builder.clone().setStorage(StorageType.NODE).createFeedStore();
      const feed = await feedStore.openFeed(feedKey, { writable: true });

      for (const i of Array.from(Array(numBlocks)).keys()) {
        await feed.append({
          id: String(i),
          value: faker.lorem.sentence()
        });
      }

      expect(feed.properties.length).to.eq(numBlocks);
    }

    // Read.
    {
      const feedStore = builder.clone().setStorage(StorageType.NODE).createFeedStore();
      const feed = await feedStore.openFeed(feedKey);
      expect(feed.properties.length).to.eq(numBlocks);
    }

    // Delete.
    {
      const storage = builder.clone().setStorage(StorageType.NODE).storage;
      await storage.destroy();
    }

    // Read (should be empty).
    {
      const feedStore = builder.clone().setStorage(StorageType.NODE).createFeedStore();
      const feed = await feedStore.openFeed(feedKey);
      expect(feed.properties.length).to.eq(0);
    }
  });
});
