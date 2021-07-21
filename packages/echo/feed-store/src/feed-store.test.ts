//
// Copyright 2019 DXOS.org
//

/* eslint-disable jest/no-test-callback */

import eos from 'end-of-stream-promise';
import hypercore from 'hypercore';
import hypertrie from 'hypertrie';
import pify from 'pify';
import ram from 'random-access-memory';
import tempy from 'tempy';

import { FeedStore } from './feed-store';

async function createDefault () {
  const directory = tempy.directory();

  return {
    directory,
    feedStore: await FeedStore.create(directory, { feedOptions: { valueEncoding: 'utf-8' } })
  };
}

async function defaultFeeds (feedStore) {
  return {
    booksFeed: await feedStore.openFeed('/books', { metadata: { topic: 'books' } }),
    usersFeed: await feedStore.openFeed('/users'),
    groupsFeed: await feedStore.openFeed('/groups')
  };
}

function append (feed, message) {
  return pify(feed.append.bind(feed))(message);
}

function head (feed) {
  return pify(feed.head.bind(feed))();
}

describe('FeedStore', () => {
  test('Config default', async () => {
    const feedStore = await FeedStore.create(ram);
    expect(feedStore).toBeInstanceOf(FeedStore);
    expect(feedStore.opened).toBeTruthy();
    expect(feedStore.storage).toBe(ram);
    await expect(feedStore.ready()).resolves.toBeUndefined();

    const feedStore2 = new FeedStore(ram);
    expect(feedStore2).toBeInstanceOf(FeedStore);
    expect(feedStore2.opened).toBeFalsy();
    feedStore2.open();
    await expect(feedStore2.ready()).resolves.toBeUndefined();
    expect(feedStore2.opened).toBeTruthy();
  });

  test('Config default + custom database + custom hypercore', async () => {
    const customHypercore = jest.fn((...args) => {
      return hypercore(...args);
    });

    const database = hypertrie(ram, { valueEncoding: 'json' });
    database.list = jest.fn((_, cb) => cb(null, []));

    const feedStore = await FeedStore.create(ram, {
      database: () => database,
      hypercore: customHypercore
    });

    expect(feedStore).toBeInstanceOf(FeedStore);
    expect(database.list.mock.calls.length).toBe(1);

    await feedStore.openFeed('/test');

    expect(customHypercore.mock.calls.length).toBe(1);
  });

  test('Should throw an assert error creating without storage.', async () => {
    await expect(FeedStore.create()).rejects.toThrow(/storage is required/);
  });

  test('Create feed', async () => {
    const { feedStore } = await createDefault();
    const { booksFeed } = await defaultFeeds(feedStore);

    expect(booksFeed).toBeInstanceOf(hypercore);

    const booksFeedDescriptor = feedStore.getDescriptors().find(fd => fd.path === '/books');
    expect(booksFeedDescriptor).toHaveProperty('path', '/books');
    expect(booksFeedDescriptor.metadata).toHaveProperty('topic', 'books');

    await append(booksFeed, 'Foundation and Empire');
    await expect(head(booksFeed)).resolves.toBe('Foundation and Empire');

    // It should return the same opened instance.
    await expect(feedStore.openFeed('/books')).resolves.toBe(booksFeed);

    // You can't open a feed with a different key.
    await expect(feedStore.openFeed('/books', { key: Buffer.from('...') })).rejects.toThrow(/Invalid public key/);
    await expect(feedStore.openFeed('/foo', { key: booksFeed.key })).rejects.toThrow(/Feed exists/);
  });

  test('Create duplicate feed', async () => {
    const { feedStore } = await createDefault();

    const [usersFeed, feed2] = await Promise.all([feedStore.openFeed('/users'), feedStore.openFeed('/users')]);
    expect(usersFeed).toBe(feed2);

    await append(usersFeed, 'alice');
    await expect(head(usersFeed)).resolves.toBe('alice');
  });

  test('Create and close a feed', async () => {
    const { feedStore } = await createDefault();

    await expect(feedStore.closeFeed('/foo')).rejects.toThrow(/Feed not found/);

    const foo = await feedStore.openFeed('/foo');
    expect(foo.opened).toBeTruthy();
    expect(foo.closed).toBeFalsy();

    await feedStore.closeFeed('/foo');
    expect(foo.closed).toBeTruthy();
  });

  test('Descriptors', async () => {
    const { feedStore } = await createDefault();
    const { booksFeed } = await defaultFeeds(feedStore);

    expect(feedStore.getDescriptors().map(fd => fd.path)).toEqual(['/books', '/users', '/groups']);
    expect(feedStore.getDescriptorByDiscoveryKey(booksFeed.discoveryKey).path).toEqual('/books');
  });

  test('Feeds', async () => {
    const { feedStore } = await createDefault();
    const { booksFeed, usersFeed, groupsFeed } = await defaultFeeds(feedStore);

    expect(feedStore.getOpenFeeds().map(f => f.key)).toEqual([booksFeed.key, usersFeed.key, groupsFeed.key]);
    expect(feedStore.getOpenFeed(fd => fd.key.equals(booksFeed.key))).toBe(booksFeed);
    expect(feedStore.getOpenFeed(() => false)).toBeUndefined();
    expect(feedStore.getOpenFeeds(fd => fd.path === '/books')).toEqual([booksFeed]);
  });

  test('Close/Load feed', async () => {
    const { feedStore } = await createDefault();
    const { booksFeed } = await defaultFeeds(feedStore);

    await feedStore.closeFeed('/books');
    expect(feedStore.getDescriptors().find(fd => fd.path === '/books')).toHaveProperty('opened', false);

    const [feed] = await feedStore.openFeeds(fd => fd.path === '/books');
    expect(feed).toBeDefined();
    expect(feed.key).toEqual(booksFeed.key);
    expect(feedStore.getDescriptors().find(fd => fd.path === '/books')).toHaveProperty('opened', true);
  });

  test('Close feedStore and their feeds', async () => {
    const { feedStore } = await createDefault();
    await defaultFeeds(feedStore);

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
    let { booksFeed, usersFeed } = await defaultFeeds(feedStore);

    await append(booksFeed, 'Foundation and Empire');
    await append(usersFeed, 'alice');

    await feedStore.close();
    await feedStore.open();
    expect(feedStore.opened).toBe(true);
    expect(feedStore.getDescriptors().length).toBe(3);

    booksFeed = await feedStore.openFeed('/books');
    ([usersFeed] = await feedStore.openFeeds(fd => fd.path === '/users'));
    expect(feedStore.getDescriptors().filter(fd => fd.opened).length).toBe(2);

    await expect(pify(booksFeed.head.bind(booksFeed))()).resolves.toBe('Foundation and Empire');
    await expect(pify(usersFeed.head.bind(usersFeed))()).resolves.toBe('alice');

    // The metadata of /books should be recreate too.
    const metadata = { topic: 'books' };
    expect(feedStore.getDescriptors().find(fd => fd.path === '/books').metadata).toEqual(metadata);
  });

  test('Delete descriptor', async () => {
    const { feedStore } = await createDefault();
    await defaultFeeds(feedStore);

    await feedStore.deleteDescriptor('/books');
    expect(feedStore.getDescriptors().length).toBe(2);
  });

  test('Default codec: binary', async () => {
    const feedStore = await FeedStore.create(ram);
    expect(feedStore).toBeInstanceOf(FeedStore);

    const feed = await feedStore.openFeed('/test');
    expect(feed).toBeInstanceOf(hypercore);
    await append(feed, 'test');
    await expect(head(feed)).resolves.toBeInstanceOf(Buffer);
  });

  test('Default codec: json + custom codecs', async () => {
    const options = {
      feedOptions: { valueEncoding: 'utf-8' },
      codecs: {
        codecA: {
          encode (val) {
            val.encodedBy = 'codecA';
            return Buffer.from(JSON.stringify(val));
          },
          decode (val) {
            return JSON.parse(val);
          }
        },
        codecB: {
          name: 'codecB',
          encode (val) {
            val.encodedBy = 'codecB';
            return Buffer.from(JSON.stringify(val));
          },
          decode (val) {
            return JSON.parse(val);
          }
        }
      }
    };
    const feedStore = await FeedStore.create(ram, options);
    expect(feedStore).toBeInstanceOf(FeedStore);

    {
      const feed = await feedStore.openFeed('/test');
      expect(feed).toBeInstanceOf(hypercore);
      await append(feed, 'test');
      await expect(head(feed)).resolves.toBe('test');
    }
    {
      const feed = await feedStore.openFeed('/a', { valueEncoding: 'codecA' });
      expect(feed).toBeInstanceOf(hypercore);
      await append(feed, { msg: 'test' });
      await expect(head(feed)).resolves.toEqual({ msg: 'test', encodedBy: 'codecA' });
    }
  });

  test('on open error should unlock the descriptor', async () => {
    const feedStore = await FeedStore.create(ram, {
      hypercore: () => {
        throw new Error('open error');
      }
    });

    await expect(feedStore.openFeed('/foo')).rejects.toThrow(/open error/);

    const fd = feedStore.getDescriptors().find(fd => fd.path === '/foo');
    const release = await fd.lock();
    expect(release).toBeDefined();
    await release();
  });

  test('on close error should unlock the descriptor', async () => {
    const feedStore = await FeedStore.create(ram, {
      hypercore: () => ({
        opened: true,
        ready (cb) {
          cb();
        },
        on () {},
        close () {
          throw new Error('close error');
        }
      })
    });

    await feedStore.openFeed('/foo');
    const fd = feedStore.getDescriptors().find(fd => fd.path === '/foo');

    await expect(feedStore.closeFeed('/foo')).rejects.toThrow(/close error/);
    await expect(feedStore.close()).rejects.toThrow(/close error/);

    const release = await fd.lock();
    expect(release).toBeDefined();
    await release();
  });

  test('on delete descriptor error should unlock the descriptor', async () => {
    const feedStore = await FeedStore.create(ram);

    await feedStore.openFeed('/foo');
    const fd = feedStore.getDescriptors().find(fd => fd.path === '/foo');

    // We remove the indexDB to force an error.
    feedStore._indexDB = null;

    await expect(feedStore.deleteDescriptor('/foo')).rejects.toThrow(Error);

    const release = await fd.lock();
    expect(release).toBeDefined();
    await release();
  });

  async function generateStreamData (feedStore, maxMessages = 200) {
    const [feed1, feed2, feed3] = await Promise.all([
      feedStore.openFeed('/feed1'),
      feedStore.openFeed('/feed2'),
      feedStore.openFeed('/feed3')
    ]);

    const messages = [];
    for (let i = 0; i < maxMessages; i++) {
      messages.push(append(feed1, `feed1/message${i}`));
      messages.push(append(feed2, `feed2/message${i}`));
    }

    await Promise.all(messages);

    return [feed1, feed2, feed3];
  }

  function asc (a, b?) {
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
    const feedStore = await FeedStore.create(ram, { feedOptions: { valueEncoding: 'utf-8' } });

    await generateStreamData(feedStore, 0);
    const onSync = jest.fn();
    const messages = [];
    const stream = feedStore.createReadStream();
    stream.on('data', (msg) => {
      messages.push(msg);
    });
    stream.on('sync', onSync);
    await new Promise(resolve => eos(stream, () => resolve()));

    expect(messages.length).toBe(0);
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({});
  });

  test('createReadStream with 200 messages', async () => {
    const feedStore = await FeedStore.create(ram, { feedOptions: { valueEncoding: 'utf-8' } });

    const [feed1, feed2] = await generateStreamData(feedStore);

    const onSync = jest.fn();
    const messages = [];
    const stream = feedStore.createReadStream();
    stream.on('data', (msg) => {
      messages.push(msg);
    });
    stream.on('sync', onSync);
    await new Promise(resolve => eos(stream, () => resolve()));

    messages.sort(asc);

    expect(messages.length).toBe(400);

    // sync test
    const syncMessages = messages.filter(m => m.sync);
    expect(syncMessages.length).toBe(2);
    expect(syncMessages[0].key).toEqual(feed1.key);
    expect(syncMessages[1].key).toEqual(feed2.key);
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({
      [feed1.key.toString('hex')]: 199,
      [feed2.key.toString('hex')]: 199
    });
  });

  test('createReadStream filter [feed2=false]', async () => {
    const feedStore = await FeedStore.create(ram, { feedOptions: { valueEncoding: 'utf-8' } });

    const [feed1, feed2] = await generateStreamData(feedStore);

    const onSync = jest.fn();
    const messages = [];
    const stream = feedStore.createReadStream(descriptor => (!descriptor.key.equals(feed2.key) && { feedStoreInfo: true }));
    stream.on('data', (msg) => messages.push(msg));
    stream.on('sync', onSync);
    await new Promise(resolve => eos(stream, () => resolve()));

    messages.sort(asc);

    expect(messages.length).toBe(200);

    // sync test
    const syncMessages = messages.filter(m => m.sync);
    expect(syncMessages.length).toBe(1);
    expect(syncMessages[0].key).toEqual(feed1.key);
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({
      [feed1.key.toString('hex')]: 199
    });
  });

  test.skip('createReadStream [live=true]', async () => {
    const feedStore = await FeedStore.create(ram, { feedOptions: { valueEncoding: 'utf-8' } });

    const [feed1, feed2, feed3] = await generateStreamData(feedStore);

    const onSync = jest.fn();
    const messages = [];
    const stream = feedStore.createReadStream({ live: true, feedStoreInfo: true });
    stream.on('data', (msg) => messages.push(msg));
    stream.on('sync', onSync);
    for (let i = 0; i < 2000; i++) {
      await append(feed3, `feed3/message${i}`);
      await new Promise(resolve => setImmediate(resolve));
    }
    process.nextTick(() => stream.destroy());
    await new Promise(resolve => eos(stream, () => resolve()));

    messages.sort(asc);

    expect(messages.length).toBe(200 * 2 + 2000);

    // sync test
    const syncMessages = messages.filter(m => m.sync);
    expect(syncMessages.length).toBe(2002);
    expect(syncMessages[0].key).toEqual(feed1.key);
    expect(syncMessages[1].key).toEqual(feed2.key);
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({
      [feed1.key.toString('hex')]: 199,
      [feed2.key.toString('hex')]: 199
    });
  });

  test('createBatchStream with 200 messages and [batch=50]', async () => {
    const feedStore = await FeedStore.create(ram, { feedOptions: { valueEncoding: 'utf-8' } });

    const [feed1, feed2] = await generateStreamData(feedStore);

    const onSync = jest.fn();
    const batches = [];
    const stream = feedStore.createBatchStream({ batch: 50, feedStoreInfo: true });
    stream.on('data', (msg) => {
      batches.push(msg);
    });
    stream.on('sync', onSync);
    await new Promise(resolve => eos(stream, () => resolve()));

    expect(batches.length).toBe(400 / 50);

    // flat data
    const messages = batches.reduce((prev, curr) => [...prev, ...curr], []);

    messages.sort(asc);

    expect(messages.length).toBe(400);

    // sync test
    const syncMessages = messages.filter(m => m.sync);
    expect(syncMessages.length).toBe(2);
    expect(syncMessages[0].key).toEqual(feed1.key);
    expect(syncMessages[1].key).toEqual(feed2.key);
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
    const messages = [];
    const stream = feedStore.createReadStream({ live: true });
    const done = new Promise(resolve => {
      stream.on('data', (msg) => {
        messages.push(msg.data);
        if (messages.length === 6) {
          resolve();
        }
      });
    });

    const waitForSync = new Promise(resolve => stream.once('sync', (state) => {
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

    await feedStore.closeFeed('/feed2');
    const reopenFeed2 = await feedStore.openFeed('/feed2');
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
    const feedStore = await FeedStore.create(ram);
    const feed = await feedStore.openFeed('/test');

    feedStore.on('append', (f) => {
      expect(f).toBe(feed);
      done();
    });

    feed.append('test');
  });

  test('update metadata', async () => {
    const root = tempy.directory();
    const feedStore = await FeedStore.create(root);
    await feedStore.openFeed('/test', { metadata: { tag: 0 } });
    let descriptor = feedStore.getDescriptors().find(fd => fd.path === '/test');
    await descriptor.setMetadata({ tag: 1 });
    expect(descriptor.metadata).toEqual({ tag: 1 });

    // Check that the metadata was updated in indexdb.
    await feedStore.close();
    await feedStore.open();
    descriptor = feedStore.getDescriptors().find(fd => fd.path === '/test');
    expect(descriptor.metadata).toEqual({ tag: 1 });
  });

  test('openFeed should wait until FeedStore is ready', async () => {
    const feedStore = new FeedStore(ram);
    feedStore.open();
    const feed = await feedStore.openFeed('/test');
    expect(feed).toBeDefined();
  });

  test('createReadStream should destroy if FeedStore is closed', async (done) => {
    const feedStore = new FeedStore(ram);

    await feedStore.open();

    const stream2 = feedStore.createReadStream();
    eos(stream2, err => {
      expect(err.message).toBe('FeedStore closed');
      done();
    });

    await feedStore.close();
  });

  test('createReadStream should destroy if filter throws an error', async () => {
    const feedStore = await FeedStore.create(ram);
    await feedStore.openFeed('/test');

    const stream = feedStore.createReadStream(async () => {
      throw new Error('filter error');
    });
    await new Promise(resolve => eos(stream, err => {
      expect(err.message).toBe('filter error');
      resolve();
    }));
  });

  test('Delete all', async () => {
    const { feedStore } = await createDefault();
    await defaultFeeds(feedStore);

    expect(feedStore.getDescriptors().length).toBe(3);
    await feedStore.deleteAllDescriptors();
    expect(feedStore.getDescriptors().length).toBe(0);
  });
});
