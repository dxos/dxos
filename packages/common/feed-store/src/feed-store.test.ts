//
// Copyright 2019 DXOS.org
//

/* eslint-disable jest/no-done-callback */

import expect from 'expect';
import hypercore from 'hypercore';
import { it as test } from 'mocha';
import assert from 'node:assert';
import { randomBytes } from 'node:crypto';
import { callbackify } from 'node:util';
import pify from 'pify';
import tempy from 'tempy';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { createKeyPair, verifySignature } from '@dxos/crypto';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { Storage, StorageType, createStorage } from '@dxos/random-access-storage';

import { FeedDescriptor } from './feed-descriptor';
import { FeedStore } from './feed-store';
import { HypercoreFeed } from './hypercore-types';

interface KeyPair {
  key: PublicKey
}

const feedNames = ['booksFeed', 'usersFeed', 'groupsFeed'];

const createFeedStore = (storage: Storage, options = {}) => {
  const feedStore = new FeedStore(storage.createDirectory('feed'), options);
  return feedStore;
};

const createDefault = async () => {
  const directory = tempy.directory();

  return {
    directory,
    feedStore: createFeedStore(createStorage({ type: StorageType.NODE, root: directory }), { valueEncoding: 'utf-8' })
  };
};
const keyring = new Keyring();

const defaultFeeds = async (feedStore: FeedStore, keys: Record<string, KeyPair>):
  Promise<Record<string, FeedDescriptor>> =>
  Object.fromEntries(await Promise.all(Object.entries<KeyPair>(keys).map(async ([feed, keyPair]) =>
    [feed, await feedStore.openReadWriteFeedWithSigner(keyPair.key, keyring)]
  )));

const append = (feed: HypercoreFeed, message: any) => pify(feed.append.bind(feed))(message);

const head = (feed: HypercoreFeed) => pify(feed.head.bind(feed))();

const createKeyPairs = async () => Object.fromEntries<KeyPair>(await Promise.all(feedNames.map(async feed => {
  const publicKey = await keyring.createKey();
  return [feed, { key: publicKey }] as const;
})));

describe.skip('FeedStore', () => {
  let keys: Record<string, KeyPair>;

  before(async () => {
    keys = await createKeyPairs();
  });

  test('Config default', async () => {
    const feedStore = await createFeedStore(createStorage({ type: StorageType.RAM }));
    expect(feedStore).toBeInstanceOf(FeedStore);

    const feedStore2 = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory('feed'));
    expect(feedStore2).toBeInstanceOf(FeedStore);
  });

  test('Create feed', async () => {
    const { feedStore } = await createDefault();
    const { booksFeed: descriptor } = await defaultFeeds(feedStore, keys);
    const { feed: booksFeed } = descriptor;

    expect(booksFeed).toBeInstanceOf(hypercore);

    const booksFeedDescriptor = await feedStore.openReadWriteFeedWithSigner(descriptor.key, keyring);
    expect(booksFeedDescriptor).toHaveProperty('key', PublicKey.from(booksFeed.key));

    await append(booksFeed, 'Foundation and Empire');
    await expect(head(booksFeed)).resolves.toBe('Foundation and Empire');

    // It should return the same opened instance.
    await expect(feedStore.openReadOnlyFeed(PublicKey.from(booksFeed.key))).resolves.toBe(booksFeedDescriptor);
  });

  test.skip('Create duplicate feed', async () => {
    const { feedStore } = await createDefault();

    const { feed: fds } = await feedStore.openReadWriteFeedWithSigner(keys.usersFeed.key, keyring);
    assert(fds.secretKey);

    const [usersFeed, feed2] = await Promise.all([
      feedStore.openReadWriteFeed(PublicKey.from(fds.key), fds.secretKey),
      feedStore.openReadWriteFeed(PublicKey.from(fds.key), fds.secretKey)
    ]);
    expect(usersFeed.feed).toBe(feed2.feed);

    await append(usersFeed.feed, 'alice');
    await expect(head(usersFeed.feed)).resolves.toBe('alice');
  });

  test('Create and close a feed', async () => {
    const { feedStore } = await createDefault();
    const publicKey = PublicKey.random();

    const foo = await feedStore.openReadOnlyFeed(publicKey);
    expect(foo.opened).toBeTruthy();

    await feedStore.close();
    expect(foo.opened).toBeFalsy();
  });

  test('Descriptors', async () => {
    const { feedStore } = await createDefault();
    await defaultFeeds(feedStore, keys);

    expect(Array.from((feedStore as any)._descriptors.values()).map((fd: any) => fd.key))
      .toEqual(Object.entries(keys).map(([, keyPair]) => keyPair.key)
      );
  });

  test('Feeds', async () => {
    const { feedStore } = await createDefault();
    const { booksFeed, usersFeed, groupsFeed } = await defaultFeeds(feedStore, keys);

    expect(Array.from((feedStore as any)._descriptors.values()).map((fd: any) => fd.key))
      .toEqual([booksFeed.key, usersFeed.key, groupsFeed.key]);
  });

  test('Close feedStore and their feeds', async () => {
    const { feedStore } = await createDefault();
    await defaultFeeds(feedStore, keys);

    expect(Array.from((feedStore as any)._descriptors.values()).map((fd: any) => fd.key).length).toBe(3);
    await feedStore.close();
    expect(Array.from((feedStore as any)._descriptors.values()).map((fd: any) => fd.key).length).toBe(0);
  });

  test.skip('Default codec: binary', async () => {
    const feedStore = createFeedStore(createStorage({ type: StorageType.RAM }));
    expect(feedStore).toBeInstanceOf(FeedStore);

    const { publicKey, secretKey } = createKeyPair();
    const { feed } = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
    expect(feed).toBeInstanceOf(hypercore);
    await append(feed, 'test');
    await expect(head(feed)).resolves.toBeInstanceOf(Buffer);
  });

  test.skip('on close error should unlock the descriptor', async () => {
    const feedStore = createFeedStore(createStorage({ type: StorageType.RAM }), {
      hypercore: () => ({
        opened: true,
        ready: (cb: () => void) => {
          cb();
        },
        on: () => {},
        close: () => {
          throw new Error('close error');
        }
      })
    });

    const publicKey = PublicKey.random();
    await feedStore.openReadOnlyFeed(publicKey);

    await expect(feedStore.close()).rejects.toThrow(/close error/);
  });

  test('feed event does not get called twice', async () => {
    const { feedStore } = await createDefault();

    let timesCalled = 0;
    feedStore.feedOpenedEvent.on(() => {
      timesCalled++;
    });

    const key = PublicKey.random();
    await feedStore.openReadOnlyFeed(key);

    await feedStore.openReadOnlyFeed(key);
    await feedStore.openReadOnlyFeed(key);
    await feedStore.openReadOnlyFeed(key);

    await sleep(20); // To flush events.

    expect(timesCalled).toEqual(1);
  });

  test('Two feeds replicating', async () => {
    const feedStore1 = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory('feed'));
    const feedStore2 = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory('feed2'));

    const keyring = new Keyring();

    const key = await keyring.createKey();
    const feed1 = await feedStore1.openReadWriteFeedWithSigner(key, keyring);
    const feed2 = await feedStore2.openReadOnlyFeed(key);

    const stream1 = feed1.feed.replicate(true);
    const stream2 = feed2.feed.replicate(false);

    stream1.pipe(stream2).pipe(stream1);

    await feed1.append('test');
    await waitForExpect(async () => {
      expect(feed2.feed.length).toBe(1);
    });
  });

  test('Two hypercores replicating', async () => {
    const { publicKey, secretKey } = createKeyPair();
    const hypercore1 = hypercore('/tmp/test-' + Math.random(), publicKey, { secretKey });
    const hypercore2 = hypercore('/tmp/test-' + Math.random(), publicKey, { });

    const stream1 = hypercore1.replicate(true);
    const stream2 = hypercore2.replicate(false);

    stream1.pipe(stream2).pipe(stream1);

    hypercore1.append('test');
    hypercore2.download();
    await waitForExpect(async () => {
      expect(hypercore2.length).toBe(1);
    });
  });

  test('Two hypercores replicating with fake crypto', async () => {
    const MOCK_CRYPTO = {
      sign: (data: any, secretKey: any, cb: any) => {
        cb(null, randomBytes(64));
      },
      verify: (signature: any, data: any, key: any, cb: any) => {
        cb(null, true);
      }
    };

    const keyring = new Keyring();
    const publicKey = (await keyring.createKey()).asBuffer().slice(1);
    const secretKey = Buffer.from('secret');

    // const { publicKey, secretKey } = { publicKey: randomBytes(64), secretKey: Buffer.from('secret') };
    // const { publicKey, secretKey } = createKeyPair();

    const hypercore1 = hypercore('/tmp/test-' + Math.random(), publicKey, { secretKey, crypto: MOCK_CRYPTO });
    const hypercore2 = hypercore('/tmp/test-' + Math.random(), publicKey, { crypto: MOCK_CRYPTO });

    const stream1 = hypercore1.replicate(true);
    const stream2 = hypercore2.replicate(false);

    stream1.pipe(stream2).pipe(stream1);

    hypercore1.append('test');
    hypercore2.download();
    await waitForExpect(async () => {
      expect(hypercore2.length).toBe(1);
    });
  });

  test('Two hypercores replicating with keyring', async () => {
    const keyring = new Keyring();
    const key = await keyring.createKey();
    const hypercoreKey = key.asBuffer().slice(1);
    const crypto = {
      sign: (data: any, secretKey: any, cb: any) => {
        callbackify(keyring.sign.bind(keyring))(key, data, (err, res) => {
          if (err) {
            cb(err);
            return;
          }
          console.log('sign', Buffer.from(res).toString('hex'));
          cb(null, Buffer.from(res));
        });
      },
      verify: async (signature: any, data: any, _key: any, cb: any) => {
        console.log({
          signature: signature.toString('hex'),
          data: data.toString('hex'),
          key: key.toString(),
          result: await verifySignature(key, data, signature)
        });
        callbackify(verifySignature)(key, data, signature, cb);
      }
    };

    const secretKey = Buffer.from('secret');

    const hypercore1 = hypercore('/tmp/test-' + Math.random(), hypercoreKey, { secretKey, crypto });
    const hypercore2 = hypercore('/tmp/test-' + Math.random(), hypercoreKey, { crypto });

    const stream1 = hypercore1.replicate(true);
    const stream2 = hypercore2.replicate(false);

    stream1.pipe(stream2).pipe(stream1);

    hypercore1.append('test');
    hypercore2.download();
    await waitForExpect(async () => {
      expect(hypercore2.length).toBe(1);
    });
  });
});
