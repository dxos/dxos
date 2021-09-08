//
// Copyright 2019 DXOS.org
//

/* eslint-disable jest/no-done-callback */

import hypercore from 'hypercore';
import hypertrie from 'hypertrie';
import pify from 'pify';
import tempy from 'tempy';

import { sleep } from '@dxos/async';
import { PublicKey, createKeyPair } from '@dxos/crypto';
import { IStorage, STORAGE_NODE, STORAGE_RAM, createStorage } from '@dxos/random-access-multi-storage';

import { FeedStore } from './feed-store';
import { HypercoreFeed } from './hypercore-types';

interface KeyPair {
  key: PublicKey,
  secretKey: Buffer
}

const feedNames = ['booksFeed', 'usersFeed', 'groupsFeed'];

const createFeedStore = async (storage: IStorage, options = {}) => {
  const feedStore = new FeedStore(storage, options);
  await feedStore.open();
  return feedStore;
};

async function createDefault () {
  const directory = tempy.directory();

  return {
    directory,
    feedStore: await createFeedStore(createStorage(directory, STORAGE_NODE), { valueEncoding: 'utf-8' })
  };
}

async function defaultFeeds (feedStore: FeedStore, keys: Record<string, KeyPair>) : Promise<Record<string, HypercoreFeed>> {
  return Object.fromEntries(await Promise.all(Object.entries<KeyPair>(keys).map(async ([feed, keyPair]) =>
    feed === 'booksFeed'
      ? [feed, await feedStore.createReadWriteFeed({ key: keyPair.key, secretKey: keyPair.secretKey, metadata: { topic: 'books' } })]
      : [feed, await feedStore.createReadWriteFeed({ key: keyPair.key, secretKey: keyPair.secretKey })]
  )));
}

function append (feed: any, message: any) {
  return pify(feed.append.bind(feed))(message);
}

function head (feed: any) {
  return pify(feed.head.bind(feed))();
}

const createKeyPairs = () => {
  return Object.fromEntries<KeyPair>(feedNames.map(feed => {
    const { publicKey, secretKey } = createKeyPair();
    return [feed, { key: PublicKey.from(publicKey), secretKey }];
  }));
};

describe('FeedStore', () => {
  const keys = createKeyPairs();

  test('Config default', async () => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM));
    expect(feedStore).toBeInstanceOf(FeedStore);
    expect(feedStore.opened).toBeTruthy();

    const feedStore2 = new FeedStore(createStorage('', STORAGE_RAM));
    expect(feedStore2).toBeInstanceOf(FeedStore);
    expect(feedStore2.opened).toBeFalsy();
    await feedStore2.open();
    expect(feedStore2.opened).toBeTruthy();
  });

  test('Config default + custom database + custom hypercore', async () => {
    const customHypercore = jest.fn((...args) => {
      return hypercore(args[0], args[1], args[2]);
    });

    const storage = createStorage('', STORAGE_RAM);
    const database = hypertrie(storage.createOrOpen.bind(storage), { valueEncoding: 'json' });
    database.list = jest.fn((_, cb) => cb(null, []));

    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM), {
      hypercore: customHypercore
    });

    expect(feedStore).toBeInstanceOf(FeedStore);

    await feedStore.createReadOnlyFeed({ key: PublicKey.random() });

    expect(customHypercore.mock.calls.length).toBe(1);
  });

  test('Create feed', async () => {
    const { feedStore } = await createDefault();
    const { booksFeed } = await defaultFeeds(feedStore, keys);

    expect(booksFeed).toBeInstanceOf(hypercore);

    const booksFeedDescriptor = feedStore.getDescriptors().find(fd => fd.key.equals(booksFeed.key));
    expect(booksFeedDescriptor).toHaveProperty('key', PublicKey.from(booksFeed.key));
    expect(booksFeedDescriptor?.metadata).toHaveProperty('topic', 'books');

    await append(booksFeed, 'Foundation and Empire');
    await expect(head(booksFeed)).resolves.toBe('Foundation and Empire');

    // It should return the same opened instance.
    await expect(feedStore.openFeed(PublicKey.from(booksFeed.key))).resolves.toBe(booksFeed);
  });

  test('Create duplicate feed', async () => {
    const { feedStore } = await createDefault();

    const fds = await feedStore.createReadWriteFeed({ key: keys.usersFeed.key, secretKey: keys.usersFeed.secretKey });

    const [usersFeed, feed2] = await Promise.all([
      feedStore.openFeed(PublicKey.from(fds.key)),
      feedStore.openFeed(PublicKey.from(fds.key))
    ]);
    expect(usersFeed).toBe(feed2);

    await append(usersFeed, 'alice');
    await expect(head(usersFeed)).resolves.toBe('alice');
  });

  test('Create and close a feed', async () => {
    const { feedStore } = await createDefault();
    const publicKey = PublicKey.random();

    await expect(feedStore.closeFeed(publicKey)).rejects.toThrow(/Feed not found/);

    const foo = await feedStore.createReadOnlyFeed({ key: publicKey });
    expect(foo.opened).toBeTruthy();
    expect(foo.closed).toBeFalsy();

    await feedStore.closeFeed(publicKey);
    expect(foo.closed).toBeTruthy();
  });

  test('Descriptors', async () => {
    const { feedStore } = await createDefault();
    const { booksFeed } = await defaultFeeds(feedStore, keys);

    expect(feedStore.getDescriptors().map(fd => fd.key)).toEqual(Object.entries(keys).map(([, keyPair]) => keyPair.key));
    expect(feedStore.getDescriptorByDiscoveryKey(booksFeed.discoveryKey)?.key).toEqual(keys.booksFeed.key);
  });

  test('Feeds', async () => {
    const { feedStore } = await createDefault();
    const { booksFeed, usersFeed, groupsFeed } = await defaultFeeds(feedStore, keys);

    expect(feedStore.getOpenFeeds().map(f => f.key)).toEqual([booksFeed.key, usersFeed.key, groupsFeed.key]);
    expect(feedStore.getOpenFeed(fd => fd.key.equals(booksFeed.key))).toBe(booksFeed);
    expect(feedStore.getOpenFeed(() => false)).toBeUndefined();
    expect(feedStore.getOpenFeeds(fd => fd.key.equals(keys.booksFeed.key))).toEqual([booksFeed]);
  });

  test('Close/Load feed', async () => {
    const { feedStore } = await createDefault();
    const { booksFeed } = await defaultFeeds(feedStore, keys);

    await feedStore.closeFeed(keys.booksFeed.key);
    expect(feedStore.getDescriptors().find(fd => fd.key.equals(keys.booksFeed.key))).toHaveProperty('opened', false);

    const [feed] = await feedStore.openFeeds(fd => fd.key.equals(keys.booksFeed.key));
    expect(feed).toBeDefined();
    expect(feed.key).toEqual(booksFeed.key);
    expect(feedStore.getDescriptors().find(fd => fd.key.equals(keys.booksFeed.key))).toHaveProperty('opened', true);
  });

  test('Close feedStore and their feeds', async () => {
    const { feedStore } = await createDefault();
    await defaultFeeds(feedStore, keys);

    expect(feedStore.opened).toBe(true);
    expect(feedStore.closed).toBe(false);
    expect(feedStore.getDescriptors().filter(fd => fd.opened).length).toBe(3);

    await feedStore.close();
    expect(feedStore.getDescriptors().filter(fd => fd.opened).length).toBe(0);
    expect(feedStore.opened).toBe(false);
    expect(feedStore.closed).toBe(true);
  });

  test('Default codec: binary', async () => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM));
    expect(feedStore).toBeInstanceOf(FeedStore);

    const { publicKey, secretKey } = createKeyPair();
    const feed = await feedStore.createReadWriteFeed({ key: PublicKey.from(publicKey), secretKey });
    expect(feed).toBeInstanceOf(hypercore);
    await append(feed, 'test');
    await expect(head(feed)).resolves.toBeInstanceOf(Buffer);
  });

  test('on open error should unlock the descriptor', async () => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM), {
      hypercore: () => {
        throw new Error('open error');
      }
    });

    const publicKey = PublicKey.random();
    await expect(feedStore.createReadOnlyFeed({ key: publicKey })).rejects.toThrow(/open error/);

    const fd = feedStore.getDescriptors().find(fd => fd.key.equals(publicKey));

    if (!fd) {
      throw new Error('Descriptor not found');
    }

    await expect(fd.lock.executeSynchronized(async () => 'Unlocked')).resolves.toBe('Unlocked');
  });

  test('on close error should unlock the descriptor', async () => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM), {
      hypercore: () => ({
        opened: true,
        ready (cb: () => void) {
          cb();
        },
        on () {},
        close () {
          throw new Error('close error');
        }
      })
    });

    const publicKey = PublicKey.random();
    await feedStore.createReadOnlyFeed({ key: publicKey });
    const fd = feedStore.getDescriptors().find(fd => fd.key.equals(publicKey));

    if (!fd) {
      throw new Error('Descriptor not found');
    }

    await expect(feedStore.closeFeed(publicKey)).rejects.toThrow(/close error/);
    await expect(feedStore.close()).rejects.toThrow(/close error/);

    await expect(fd.lock.executeSynchronized(async () => 'Unlocked')).resolves.toBe('Unlocked');
  });

  test('append event', async (done) => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM));
    const { publicKey, secretKey } = createKeyPair();
    const feed = await feedStore.createReadWriteFeed({ key: PublicKey.from(publicKey), secretKey });

    feedStore.appendEvent.on((descriptor) => {
      expect(descriptor.feed).toBe(feed);
      done();
    });

    feed.append('test');
  });

  test('openFeed should wait until FeedStore is ready', async () => {
    const feedStore = new FeedStore(createStorage('', STORAGE_RAM));
    await feedStore.open();
    const publicKey = PublicKey.random();
    const feed = await feedStore.createReadOnlyFeed({ key: publicKey });
    expect(feed).toBeDefined();
  });

  test('feed event does not get called twice', async () => {
    const { feedStore } = await createDefault();

    let timesCalled = 0;
    feedStore.feedOpenedEvent.on(() => {
      timesCalled++;
    });

    const key = PublicKey.random();
    await feedStore.createReadOnlyFeed({ key });

    await feedStore.openFeed(key);
    await feedStore.openFeed(key);
    await feedStore.openFeed(key);

    await sleep(20); // To flush events

    expect(timesCalled).toEqual(1);
  });
});
