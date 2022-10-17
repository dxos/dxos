//
// Copyright 2022 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import faker from 'faker';

import { PublicKey } from '@dxos/keys';
import { StorageType } from '@dxos/random-access-storage';

import { TestBuilder } from './testing';

chai.use(chaiAsPromised);

// TODO(burdon): Exception types.
// TODO(burdon): patchBufferCodec => createEncoding (@dxos/hypercore)

describe('FeedStore', function () {
  it('creates feeds', async function () {
    const feedStore = new TestBuilder().createFeedStore();

    const keys = await Promise.all(Array.from(Array(10)).map(async () => {
      const key = PublicKey.random();
      await feedStore.openFeed(key);
      return key;
    }));

    {
      for (const publicKey of keys) {
        const feed = feedStore.getFeed(publicKey)!;
        expect(feed.key).to.eq(publicKey);
        expect(feed.properties.opened).to.be.true;
        expect(feed.properties.readable).to.be.true;
        expect(feed.properties.writable).to.be.false;
      }

      expect(feedStore.size).to.eq(keys.length);
    }

    {
      await feedStore.clear();
      expect(feedStore.size).to.eq(0);
    }
  });

  it('gets an opened feed', async function () {
    const feedStore = new TestBuilder().createFeedStore();

    const key = PublicKey.random();

    {
      const feed = await feedStore.openFeed(key);
      expect(feed.key).to.eq(key);
      expect(feed.properties.writable).to.be.false;
      expect(feedStore.size).to.eq(1);
    }

    {
      const feed = await feedStore.openFeed(key);
      expect(feed.key).to.eq(key);
      expect(feed.properties.writable).to.be.false;
      expect(feedStore.size).to.eq(1);
    }
  });

  it('tries to open an existing readable feed as writable', async function () {
    const feedStore = new TestBuilder().createFeedStore();
    const key = PublicKey.random();

    {
      const feed = await feedStore.openFeed(key);
      expect(feed.key).to.eq(key);
      expect(feed.properties.writable).to.be.false;
      expect(feedStore.size).to.eq(1);
    }

    // Attempt to reopen as writable (fail).
    {
      await expect(feedStore.openFeed(key, { writable: true })).to.be.rejected;
    }
  });

  it('reopens a feed and reads data from storage', async function () {
    if (mochaExecutor.environment !== 'nodejs') {
      this.skip();
    }

    const builder = new TestBuilder();
    const feedKey = await builder.keyring!.createKey();

    const numBlocks = 10;

    // Write.
    // Note: Node is required to make this persistent across invocations.
    {
      const feedStore = builder.clone().setStorage(StorageType.NODE).createFeedStore();
      const feed = await feedStore.openFeed(feedKey, { writable: true });
      for (const _ of Array.from(Array(numBlocks))) {
        await feed.append(faker.lorem.sentence());
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
