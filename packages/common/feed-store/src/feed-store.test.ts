//
// Copyright 2022 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import faker from 'faker';

import { PublicKey } from '@dxos/keys';
import { StorageType } from '@dxos/random-access-storage';

import { TestBuilder } from './testing';

// TODO(burdon): Exception types.
// TODO(burdon): patchBufferCodec => createEncoding (@dxos/hypercore)

chai.use(chaiAsPromised);

describe('FeedStore', function () {

  // TODO(burdon): Test persistent Node storage (and clean-up after test).

  it('Creates feeds.', async function () {
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
      await feedStore.close();
      expect(feedStore.size).to.eq(0);
    }
  });

  it('Gets an opened feed.', async function () {
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

    // Reopen as writable.
    {
      const feed = await feedStore.openFeed(key, { writable: true });
      expect(feed.key).to.eq(key);
      expect(feed.properties.writable).to.be.true;
      expect(feedStore.size).to.eq(1);
    }
  });

  it('Reopens a feed and reads data from disk', async function () {
    const builder = new TestBuilder();
    const feedKey = await builder.keyring!.createKey();

    const numBlocks = 10;

    // Write.
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
      // TODO(burdon): Delete directory.
      const storage = builder.clone().setStorage(StorageType.NODE).storage;
      await storage.destroy();
      console.log(String(storage));
    }

    // Read.
    {
      const feedStore = builder.clone().setStorage(StorageType.NODE).createFeedStore();
      const feed = await feedStore.openFeed(feedKey);
      expect(feed.properties.length).to.eq(0);
    }
  });
});
