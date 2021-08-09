//
// Copyright 2019 DXOS.org
//

/* eslint-disable jest/no-done-callback */

import eos from 'end-of-stream-promise';
import hypercore from 'hypercore';
import hypertrie from 'hypertrie';
import pify from 'pify';
import tempy from 'tempy';

import { PublicKey, createKeyPair } from '@dxos/crypto';
import { IStorage, STORAGE_NODE, STORAGE_RAM, createStorage } from '@dxos/random-access-multi-storage';

import { FeedStore } from './feed-store';
import { Feed } from './hypercore-types';
import { sleep } from '@dxos/async';

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
    feedStore: await createFeedStore(createStorage(directory, STORAGE_NODE), { feedOptions: { valueEncoding: 'utf-8' } })
  };
}

async function defaultFeeds (feedStore: FeedStore, keys: { [k: string]: KeyPair }) : Promise<{ [k: string] : Feed }> {
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
      database: () => database,
      hypercore: customHypercore
    });

    expect(feedStore).toBeInstanceOf(FeedStore);
    expect(database.list.mock.calls.length).toBe(1);

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

  test('Reopen feedStore and recreate feeds from the indexDB', async () => {
    const { feedStore } = await createDefault();
    let { booksFeed, usersFeed } = await defaultFeeds(feedStore, keys);

    await append(booksFeed, 'Foundation and Empire');
    await append(usersFeed, 'alice');

    await feedStore.close();
    await feedStore.open();
    expect(feedStore.opened).toBe(true);
    expect(feedStore.getDescriptors().length).toBe(3);

    booksFeed = await feedStore.openFeed(keys.booksFeed.key);
    [usersFeed] = await feedStore.openFeeds(fd => fd.key.equals(keys.usersFeed.key));
    expect(feedStore.getDescriptors().filter(fd => fd.opened).length).toBe(2);

    await expect(pify(booksFeed.head.bind(booksFeed))()).resolves.toBe('Foundation and Empire');
    await expect(pify(usersFeed.head.bind(usersFeed))()).resolves.toBe('alice');

    // The metadata of /books should be recreate too.
    const metadata = { topic: 'books' };
    expect(feedStore.getDescriptors().find(fd => fd.key.equals(keys.booksFeed.key))?.metadata).toEqual(metadata);
  });

  test('Delete descriptor', async () => {
    const { feedStore } = await createDefault();
    await defaultFeeds(feedStore, keys);

    await feedStore.deleteDescriptor(keys.booksFeed.key);
    expect(feedStore.getDescriptors().length).toBe(2);
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

  test('Default codec: json + custom codecs', async () => {
    const options = {
      feedOptions: { valueEncoding: 'utf-8' },
      codecs: {
        codecA: {
          encode (val: any) {
            val.encodedBy = 'codecA';
            return Buffer.from(JSON.stringify(val));
          },
          decode (val: any) {
            return JSON.parse(val);
          }
        },
        codecB: {
          name: 'codecB',
          encode (val: any) {
            val.encodedBy = 'codecB';
            return Buffer.from(JSON.stringify(val));
          },
          decode (val: any) {
            return JSON.parse(val);
          }
        }
      }
    };
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM), options);
    expect(feedStore).toBeInstanceOf(FeedStore);

    {
      const { publicKey, secretKey } = createKeyPair();
      const feed = await feedStore.createReadWriteFeed({ key: PublicKey.from(publicKey), secretKey });
      expect(feed).toBeInstanceOf(hypercore);
      await append(feed, 'test');
      await expect(head(feed)).resolves.toBe('test');
    }
    {
      const { publicKey, secretKey } = createKeyPair();
      const feed = await feedStore.createReadWriteFeed({ key: PublicKey.from(publicKey), secretKey, valueEncoding: 'codecA' });
      expect(feed).toBeInstanceOf(hypercore);
      await append(feed, { msg: 'test' });
      await expect(head(feed)).resolves.toEqual({ msg: 'test', encodedBy: 'codecA' });
    }
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

  test('on delete descriptor error should unlock the descriptor', async () => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM));

    const publicKey = PublicKey.random();
    await feedStore.createReadOnlyFeed({ key: publicKey });
    const fd = feedStore.getDescriptors().find(fd => fd.key.equals(publicKey));

    if (!fd) {
      throw new Error('Descriptor not found');
    }

    // We remove the indexDB to force an error.
    (feedStore as any)._indexDB = null;

    await expect(feedStore.deleteDescriptor(publicKey)).rejects.toThrow(Error);

    await expect(fd.lock.executeSynchronized(async () => 'Unlocked')).resolves.toBe('Unlocked');
  });

  async function generateStreamData (feedStore: FeedStore, maxMessages = 200) {
    const keyPairs = Array.from(Array(3)).map(() => createKeyPair());
    const [feed1, feed2, feed3] = await Promise.all([
      feedStore.createReadWriteFeed({ key: PublicKey.from(keyPairs[0].publicKey), secretKey: keyPairs[0].secretKey }),
      feedStore.createReadWriteFeed({ key: PublicKey.from(keyPairs[1].publicKey), secretKey: keyPairs[1].secretKey }),
      feedStore.createReadWriteFeed({ key: PublicKey.from(keyPairs[2].publicKey), secretKey: keyPairs[2].secretKey })
    ]);

    const messages = [];
    for (let i = 0; i < maxMessages; i++) {
      messages.push(append(feed1, `feed1/message${i}`));
      messages.push(append(feed2, `feed2/message${i}`));
    }

    await Promise.all(messages);

    return [feed1, feed2, feed3];
  }

  function asc (a: any, b?: any) {
    if (a.data > b.data) {
      return 1;
    }
    if (a.data < b.data) {
      return -1;
    }
    // a must be equal to b
    return 0;
  }

  test('createReadStream with empty messages', async () => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM), { feedOptions: { valueEncoding: 'utf-8' } });

    await generateStreamData(feedStore, 0);
    const onSync = jest.fn();
    const messages = [];
    const stream = feedStore.createReadStream();
    stream.on('data', (msg: any) => {
      messages.push(msg);
    });
    stream.on('sync', onSync);
    await new Promise<void>(resolve => eos(stream, () => resolve()));

    expect(messages.length).toBe(0);
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({});
  });

  test('createReadStream with 200 messages', async () => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM), { feedOptions: { valueEncoding: 'utf-8' } });

    const [feed1, feed2] = await generateStreamData(feedStore);

    const onSync = jest.fn();
    const messages: any[] = [];
    const stream = feedStore.createReadStream();
    stream.on('data', (msg: any) => {
      messages.push(msg);
    });
    stream.on('sync', onSync);
    await new Promise<void>(resolve => eos(stream, () => resolve()));

    messages.sort(asc);

    expect(messages.length).toBe(400);

    // sync test
    const syncMessages = messages.filter(m => m.sync);
    expect(syncMessages.length).toBe(2);
    expect(syncMessages[0].key).toEqual(PublicKey.from(feed1.key));
    expect(syncMessages[1].key).toEqual(PublicKey.from(feed2.key));
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({
      [feed1.key.toString('hex')]: 199,
      [feed2.key.toString('hex')]: 199
    });
  });

  test('createReadStream filter [feed2=false]', async () => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM), { feedOptions: { valueEncoding: 'utf-8' } });

    const [feed1, feed2] = await generateStreamData(feedStore);

    const onSync = jest.fn();
    const messages: any[] = [];
    const stream = feedStore.createReadStream(descriptor => !descriptor.key.equals(feed2.key) && { feedStoreInfo: true });
    stream.on('data', (msg: any) => messages.push(msg));
    stream.on('sync', onSync);
    await new Promise<void>(resolve => eos(stream, () => resolve()));

    messages.sort(asc);

    expect(messages.length).toBe(200);

    // sync test
    const syncMessages = messages.filter(m => m.sync);
    expect(syncMessages.length).toBe(1);
    expect(syncMessages[0].key).toEqual(PublicKey.from(feed1.key));
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({
      [feed1.key.toString('hex')]: 199
    });
  });

  test.skip('createReadStream [live=true]', async () => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM), { feedOptions: { valueEncoding: 'utf-8' } });

    const [feed1, feed2, feed3] = await generateStreamData(feedStore);

    const onSync = jest.fn();
    const messages: any[] = [];
    const stream = feedStore.createReadStream({ live: true, feedStoreInfo: true });
    stream.on('data', (msg: any) => messages.push(msg));
    stream.on('sync', onSync);
    for (let i = 0; i < 2000; i++) {
      await append(feed3, `feed3/message${i}`);
      await new Promise(resolve => setImmediate(resolve));
    }
    process.nextTick(() => stream.destroy());
    await new Promise<void>(resolve => eos(stream, () => resolve()));

    messages.sort(asc);

    expect(messages.length).toBe(200 * 2 + 2000);

    // sync test
    const syncMessages = messages.filter(m => m.sync);
    expect(syncMessages.length).toBe(2002);
    expect(syncMessages[0].key).toEqual(PublicKey.from(feed1.key));
    expect(syncMessages[1].key).toEqual(PublicKey.from(feed2.key));
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({
      [feed1.key.toString('hex')]: 199,
      [feed2.key.toString('hex')]: 199
    });
  });

  test('createBatchStream with 200 messages and [batch=50]', async () => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM), { feedOptions: { valueEncoding: 'utf-8' } });

    const [feed1, feed2] = await generateStreamData(feedStore);

    const onSync = jest.fn();
    const batches: any[] = [];
    const stream = feedStore.createBatchStream({ batch: 50, feedStoreInfo: true });
    stream.on('data', (msg: any) => {
      batches.push(msg);
    });
    stream.on('sync', onSync);
    await new Promise<void>(resolve => eos(stream, () => resolve()));

    expect(batches.length).toBe(400 / 50);

    // flat data
    const messages = batches.reduce((prev, curr) => [...prev, ...curr], []);

    messages.sort(asc);

    expect(messages.length).toBe(400);

    // sync test
    const syncMessages = messages.filter((m: any) => m.sync);
    expect(syncMessages.length).toBe(2);
    expect(syncMessages[0].key).toEqual(PublicKey.from(feed1.key));
    expect(syncMessages[1].key).toEqual(PublicKey.from(feed2.key));
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({
      [feed1.key.toString('hex')]: 199,
      [feed2.key.toString('hex')]: 199
    });
  });

  test('createReadStream and check re-open a feed [live=true]', async () => {
    const { feedStore } = await createDefault();

    const [feed1, feed2, feed3] = await generateStreamData(feedStore, 2);

    const onSync = jest.fn();
    const messages: any[] = [];
    const stream = feedStore.createReadStream({ live: true });
    const done = new Promise<void>(resolve => {
      stream.on('data', (msg: any) => {
        messages.push(msg.data);
        if (messages.length === 6) {
          resolve();
        }
      });
    });

    const waitForSync = new Promise<void>(resolve => stream.once('sync', (state: any) => {
      onSync(state);
      resolve();
    }));

    await waitForSync;

    expect(messages.length).toBe(4);
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({
      [feed1.key.toString('hex')]: 1,
      [feed2.key.toString('hex')]: 1
    });

    expect(stream.state()).toStrictEqual({
      [feed1.key.toString('hex')]: 1,
      [feed2.key.toString('hex')]: 1,
      [feed3.key.toString('hex')]: 0
    });

    const { key } = feed2;
    await feedStore.closeFeed(PublicKey.from(key));
    const reopenFeed2 = await feedStore.openFeed(PublicKey.from(key));
    await append(reopenFeed2, `feed2/message${reopenFeed2.length}`);
    await append(reopenFeed2, `feed2/message${reopenFeed2.length}`);

    await done;

    messages.sort();

    expect(messages).toStrictEqual([
      'feed1/message0',
      'feed1/message1',
      'feed2/message0',
      'feed2/message1',
      'feed2/message2',
      'feed2/message3'
    ]);
    expect(stream.state()).toStrictEqual({
      [feed1.key.toString('hex')]: 1,
      [feed2.key.toString('hex')]: 3,
      [feed3.key.toString('hex')]: 0
    });
  });

  test('append event', async (done) => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM));
    const { publicKey, secretKey } = createKeyPair();
    const feed = await feedStore.createReadWriteFeed({ key: PublicKey.from(publicKey), secretKey });

    feedStore.on('append', (f) => {
      expect(f).toBe(feed);
      done();
    });

    feed.append('test');
  });

  test('update metadata', async () => {
    const root = tempy.directory();
    const feedStore = await createFeedStore(createStorage(root, STORAGE_NODE));
    const publicKey = PublicKey.random();
    await feedStore.createReadOnlyFeed({ key: publicKey, metadata: { tag: 0 } });
    let descriptor = feedStore.getDescriptors().find(fd => fd.key.equals(publicKey));
    if (!descriptor) {
      throw new Error('No descriptor found');
    }
    await descriptor.setMetadata({ tag: 1 });
    expect(descriptor.metadata).toEqual({ tag: 1 });

    // Check that the metadata was updated in indexdb.
    await feedStore.close();
    await feedStore.open();
    descriptor = feedStore.getDescriptors().find(fd => fd.key.equals(publicKey));
    if (!descriptor) {
      throw new Error('No descriptor found');
    }
    expect(descriptor.metadata).toEqual({ tag: 1 });
  });

  test('openFeed should wait until FeedStore is ready', async () => {
    const feedStore = new FeedStore(createStorage('', STORAGE_RAM));
    feedStore.open();
    const publicKey = PublicKey.random();
    const feed = await feedStore.createReadOnlyFeed({ key: publicKey });
    expect(feed).toBeDefined();
  });

  test('createReadStream should destroy if FeedStore is closed', async (done) => {
    const feedStore = new FeedStore(createStorage('', STORAGE_RAM));

    await feedStore.open();

    const stream2 = feedStore.createReadStream();
    eos(stream2, (err: Error) => {
      expect(err.message).toBe('FeedStore closed');
      done();
    });

    await feedStore.close();
  });

  test('createReadStream should destroy if filter throws an error', async () => {
    const feedStore = await createFeedStore(createStorage('', STORAGE_RAM));
    const publicKey = PublicKey.random();
    await feedStore.createReadOnlyFeed({ key: publicKey });

    const stream = feedStore.createReadStream(async () => {
      throw new Error('filter error');
    });
    await new Promise<void>(resolve => eos(stream, (err: Error) => {
      expect(err.message).toBe('filter error');
      resolve();
    }));
  });

  test('Delete all', async () => {
    const { feedStore } = await createDefault();
    await defaultFeeds(feedStore, keys);

    expect(feedStore.getDescriptors().length).toBe(3);
    await feedStore.deleteAllDescriptors();
    expect(feedStore.getDescriptors().length).toBe(0);
  });

  test('creating same feed twice should error', async () => {
    const { feedStore } = await createDefault()

    const key = PublicKey.random()
    await feedStore.createReadOnlyFeed({ key })

    await expect(feedStore.createReadOnlyFeed({ key })).rejects.toBeInstanceOf(Error);
  })

  // test('creating same feed twice should error', async () => {
  //   const { feedStore } = await createDefault()

  //   const key = PublicKey.random()
  //   const secretKey = PublicKey.random()
  //   await feedStore.createReadWriteFeed({ key, secretKey })

  //   await expect(feedStore.createReadWriteFeed({ key, secretKey })).rejects.toBeInstanceOf(Error);
  // })

  test('feed event does not get called twice', async () => {
    const { feedStore } = await createDefault()

    let timesCalled = 0;
    feedStore.on('feed', () => {
      timesCalled++;
    })

    const key = PublicKey.random()
    await feedStore.createReadOnlyFeed({ key })

    await feedStore.openFeed(key)
    await feedStore.openFeed(key)
    await feedStore.openFeed(key)

    await sleep(20) // To flush events

    expect(timesCalled).toEqual(1)
  })
});
