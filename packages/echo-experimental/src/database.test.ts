//
// Copyright 2020 DXOS.org
//

import Chance from 'chance';
import debug from 'debug';
import ram from 'random-access-memory';
import tempy from 'tempy';

import { sleep } from '@dxos/async';
import { FeedStore } from '@dxos/feed-store';
import { Codec } from '@dxos/codec-protobuf';
import { createId, keyToString } from '@dxos/crypto';

import {
  createItemDemuxer,
  createFeedStream,
  ItemManager,
  Model,
  ModelMessage,
  ModelFactory,
  createPartyMuxer
} from './database';
import { latch } from './util';

import TestingSchema from './proto/gen/testing.json';
import waitForExpect from 'wait-for-expect';

const log = debug('dxos:echo:testing');
debug.enable('dxos:echo:*');

const codec = new Codec('dxos.echo.testing.Envelope')
  .addJson(TestingSchema)
  .build();

const chance = new Chance();

/**
 * Test model.
 */
// TODO(burdon): Replace with echo ObjectModel.
class TestModel extends Model {
  // TODO(burdon): Format?
  static type = 'wrn://dxos.io/model/test';

  _values = new Map();

  get keys () {
    return Array.from(this._values.keys());
  }

  get value () {
    return Object.fromEntries(this._values);
  }

  getValue (key: string) {
    return this._values.get(key);
  }

  async processMessage (message: ModelMessage) {
    const { data: { key, value } } = message;
    await sleep(50);
    this._values.set(key, value);
  }

  async setProperty (key: string, value: string) {
    // TODO(burdon): Create wrapper for ItemMutation that includes the itemId.
    await this.write({
      __type_url: 'dxos.echo.testing.TestItemMutation',
      itemId: this.itemId,
      key,
      value
    });
  }
}

test('item construction', async () => {
  const modelFactory = new ModelFactory().registerModel(TestModel.type, TestModel);

  const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
  await feedStore.open();
  const feed = await feedStore.openFeed('test');

  const readable = feedStore.createReadStream({ live: true });
  const itemManager = new ItemManager(modelFactory, createFeedStream(feed));
  readable.pipe(createItemDemuxer(itemManager));

  const item = await itemManager.createItem(TestModel.type);
  await (item.model as TestModel).setProperty('title', 'Hello');

  const items = itemManager.getItems();
  expect(items).toHaveLength(1);
  (items[0].model as TestModel).on('update', model => {
    expect(model.value).toEqual({ title: 'Hello' });
  });
});

test('streaming', async () => {
  const config = {
    numFeeds: 1,
    maxItems: 1,
    numMutations: 5
  };

  const modelFactory = new ModelFactory().registerModel(TestModel.type, TestModel);

  const directory = tempy.directory();

  // TODO(burdon): Create feedstore inside each scope (with same directory).
  const feedStore = new FeedStore(directory, { feedOptions: { valueEncoding: codec } });

  const count = {
    items: 0,
    mutations: 0
  };

  //
  // Generate items.
  //
  {
    // TODO(burdon): Replace feed with Writeable stream from PartyManager.
    // const feedStore = new FeedStore(directory, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();
    const feed = await feedStore.openFeed('test');
    const readable = feedStore.createReadStream({ live: true });

    const itemManager = new ItemManager(modelFactory, createFeedStream(feed));

    // NOTE: This will be the Party's readable stream.
    readable.pipe(createItemDemuxer(itemManager));

    // Randomly create or mutate items.
    for (let i = 0; i < config.numMutations; i++) {
      if (count.items === 0 || (count.items < config.maxItems && Math.random() < 0.5)) {
        const item = await itemManager.createItem(TestModel.type);
        log('Created Item:', item.id);
        count.items++;
      } else {
        const item = chance.pickone(itemManager.getItems());
        log('Mutating Item:', item.id);
        item.model.setProperty(chance.pickone(['a', 'b', 'c']), `value-${i}`);
        count.mutations++;
      }
    }

    // TODO(burdon): Breaks if close feedstore.
    // await feedStore.close();
  }

  log('Config:', config);
  log('Count:', count);

  //
  // Replay items.
  //
  {
    // const feedStore = new FeedStore(directory, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();
    const readable = feedStore.createReadStream({ live: true });

    const descriptors = feedStore.getDescriptors();
    expect(descriptors).toHaveLength(config.numFeeds);
    const { feed } = chance.pickone(descriptors);

    const itemManager = new ItemManager(modelFactory, createFeedStream(feed));

    // NOTE: This will be the Party's readable stream.
    readable.pipe(createItemDemuxer(itemManager));

    // Wait for items to be processed.
    const [promiseItems, callbackItem] = latch(count.items);
    itemManager.on('create', callbackItem);
    expect(await promiseItems).toBe(count.items);

    // Wait for all messages to be processed.
    const [promiseUpdates, callbackUpdate] = latch(count.mutations);
    const items = itemManager.getItems();
    for (const item of items) {
      item.model.on('update', callbackUpdate);
    }
    expect(await promiseUpdates).toBe(count.mutations);

    // TODO(burdon): Test items have same state.
    for (const item of items) {
      log((item.model as TestModel).value);
    }

    await feedStore.close();
  }
});

test.skip('parties', async () => {
  const modelFactory = new ModelFactory().registerModel(TestModel.type, TestModel);

  const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
  await feedStore.open();

  const feeds = [
    await feedStore.openFeed('feed-1'),
    await feedStore.openFeed('feed-2'),
    await feedStore.openFeed('feed-3')
  ];

  const descriptors = [
    feedStore.getOpenFeed((descriptor: any) => descriptor.path === 'feed-1'),
    feedStore.getOpenFeed((descriptor: any) => descriptor.path === 'feed-2'),
    feedStore.getOpenFeed((descriptor: any) => descriptor.path === 'feed-3')
  ];

  const streams = [
    createFeedStream(feeds[0]),
    createFeedStream(feeds[1]),
    createFeedStream(feeds[2])
  ];

  const itemIds = [
    createId()
  ];

  // TODO(burdon): Better way to simulate multiple nodes?
  streams[0].write({
    message: {
      __type_url: 'dxos.echo.testing.TestItemGenesis',
      model: TestModel.type,
      itemId: itemIds[0]
    }
  });
  streams[0].write({
    message: {
      __type_url: 'dxos.echo.testing.TestItemMutation',
      itemId: itemIds[0],
      key: 'title',
      value: 'Hi'
    }
  });
  streams[1].write({
    message: {
      __type_url: 'dxos.echo.testing.TestItemMutation',
      itemId: itemIds[0],
      key: 'title',
      value: 'World'
    }
  });

  const itemManager = new ItemManager(modelFactory, streams[0]);

  createPartyMuxer(itemManager, feedStore, [keyToString(descriptors[0].key)]);

  // TODO(burdon): Wait for everything to be read?
  await waitForExpect(() => {
    const items = itemManager.getItems();
    expect(items).toHaveLength(1);
    expect((items[0].model as TestModel).getValue('title')).toEqual('Hi');
  });

  streams[0].write({
    message: {
      __type_url: 'dxos.echo.testing.TestItemMutation',
      itemId: itemIds[0],
      key: 'title',
      value: 'Hello'
    }
  });

  await waitForExpect(() => {
    const items = itemManager.getItems();
    expect(items).toHaveLength(1);
    expect((items[0].model as TestModel).getValue('title')).toEqual('Hello');
  });

  streams[0].write({
    message: {
      __type_url: 'dxos.echo.testing.TestAdmit',
      feedKey: keyToString(descriptors[1].key)
    }
  });

  await waitForExpect(() => {
    const items = itemManager.getItems();
    expect(items).toHaveLength(1);
    expect((items[0].model as TestModel).getValue('title')).toEqual('World');
  });
});
