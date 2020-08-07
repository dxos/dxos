//
// Copyright 2020 DXOS.org
//

import Chance from 'chance';
import debug from 'debug';
import ram from 'random-access-memory';
import tempy from 'tempy';
import waitForExpect from 'wait-for-expect';

import { FeedStore } from '@dxos/feed-store';
import { Codec } from '@dxos/codec-protobuf';
import { createId, keyToString } from '@dxos/crypto';

import { createWritableFeedStream, createItemDemuxer, ItemManager, ModelFactory, PartyMuxer } from './database';
import { TestModel } from './test-model';
import { latch } from './util';

import TestingSchema from './proto/gen/testing.json';

const log = debug('dxos:echo:testing');
debug.enable('dxos:echo:*');

const codec = new Codec('dxos.echo.testing.Envelope')
  .addJson(TestingSchema)
  .build();

const chance = new Chance();

test('item construction', async () => {
  const modelFactory = new ModelFactory().registerModel(TestModel.type, TestModel);

  const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
  await feedStore.open();
  const feed = await feedStore.openFeed('test');

  // TODO(burdon): NOTE: Stream from readable is different from expected FeedMessage.
  const readable = feedStore.createReadStream({ live: true, feedStoreInfo: true });
  const itemManager = new ItemManager(modelFactory, createWritableFeedStream(feed));
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

  // TODO(burdon): Create feedstore inside each scope (with same directory).
  const directory = tempy.directory();
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

    const itemManager = new ItemManager(modelFactory, createWritableFeedStream(feed));

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

    const itemManager = new ItemManager(modelFactory, createWritableFeedStream(feed));

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

test('parties', async () => {
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
    createWritableFeedStream(feeds[0]),
    createWritableFeedStream(feeds[1]),
    createWritableFeedStream(feeds[2])
  ];

  const itemIds = [
    createId()
  ];

  streams[0].write({
    message: {
      __type_url: 'dxos.echo.testing.ItemEnvelope',
      itemId: itemIds[0],
      payload: {
        __type_url: 'dxos.echo.testing.ItemGenesis',
        model: TestModel.type
      }
    }
  });
  streams[0].write({
    message: {
      __type_url: 'dxos.echo.testing.ItemEnvelope',
      itemId: itemIds[0],
      payload: {
        __type_url: 'dxos.echo.testing.ItemMutation',
        key: 'title',
        value: 'Hi'
      }
    }
  });
  streams[1].write({
    message: {
      __type_url: 'dxos.echo.testing.ItemEnvelope',
      itemId: itemIds[0],
      payload: {
        __type_url: 'dxos.echo.testing.ItemMutation',
        key: 'title',
        value: 'World'
      }
    }
  });

  const partyMuxer = new PartyMuxer(feedStore, [keyToString(descriptors[0].key)]);

  const itemManager = new ItemManager(modelFactory, streams[0]);
  const itemDemuxer = createItemDemuxer(itemManager);

  // TODO(burdon): Bad API: Just create a stream.
  partyMuxer.output.pipe(itemDemuxer);

  // TODO(burdon): ???
  setImmediate(() => partyMuxer.run());

  // TODO(burdon): Wait for everything to be read?
  await waitForExpect(() => {
    const items = itemManager.getItems();
    expect(items).toHaveLength(1);
    expect((items[0].model as TestModel).getValue('title')).toEqual('Hi');
  });

  streams[0].write({
    message: {
      __type_url: 'dxos.echo.testing.ItemEnvelope',
      itemId: itemIds[0],
      payload: {
        __type_url: 'dxos.echo.testing.ItemMutation',
        key: 'title',
        value: 'Hello'
      }
    }
  });

  await waitForExpect(() => {
    const items = itemManager.getItems();
    expect(items).toHaveLength(1);
    expect((items[0].model as TestModel).getValue('title')).toEqual('Hello');
  });

  streams[0].write({
    message: {
      __type_url: 'dxos.echo.testing.Admit',
      feedKey: keyToString(descriptors[1].key)
    }
  });

  await waitForExpect(() => {
    const items = itemManager.getItems();
    expect(items).toHaveLength(1);
    expect((items[0].model as TestModel).getValue('title')).toEqual('World');
  });
});
