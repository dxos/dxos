//
// Copyright 2020 DXOS.org
//

import Chance from 'chance';
import debug from 'debug';
import ram from 'random-access-memory';
import tempy from 'tempy';

import { FeedStore } from '@dxos/feed-store';
import { Codec } from '@dxos/codec-protobuf';
import { createId, randomBytes } from '@dxos/crypto';
import { sleep } from '@dxos/async';

import {
  createWritableFeedStream, createPartyMuxer, createItemDemuxer, ItemManager, ModelFactory, createTimestampTransform
} from './database';
import { TestModel } from './test-model';
import { sink } from './util';
import { createAdmit, createItemGenesis, createItemMutation, collect, createTestMessageWithTimestamp } from './testing';

import TestingSchema from './proto/gen/testing.json';
import { LogicalClockStamp } from './logical-clock-stamp';

const log = debug('dxos:echo:testing');
debug.enable('dxos:echo:*');

const codec = new Codec('dxos.echo.testing.Envelope')
  .addJson(TestingSchema)
  .build();

const chance = new Chance();

/* eslint-disable no-lone-blocks */
describe('database', () => {
  test('item construction', async () => {
    const modelFactory = new ModelFactory().registerModel(TestModel.type, TestModel);

    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();
    const feed = await feedStore.openFeed('test');

    // TODO(burdon): NOTE: Stream from readable is different from expected FeedMessage.
    const readable = feedStore.createReadStream({ live: true, feedStoreInfo: true });
    const itemManager = new ItemManager(modelFactory, createWritableFeedStream(feed));
    readable.pipe(createItemDemuxer(itemManager));

    const item = await itemManager.createItem('test', TestModel.type);
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

    const count = {
      items: 0,
      mutations: 0
    };

    // Temp store for feeds.
    const directory = tempy.directory();

    //
    // Generate items.
    //
    {
      const feedStore = new FeedStore(directory, { feedOptions: { valueEncoding: codec } });
      await feedStore.open();

      const feed = await feedStore.openFeed('test');
      const readable = feedStore.createReadStream({ live: true });
      const counter = sink(feed, 'append', config.numMutations);

      const itemManager = new ItemManager(modelFactory, createWritableFeedStream(feed));
      readable.pipe(createItemDemuxer(itemManager));

      // Randomly create or mutate items.
      for (let i = 0; i < config.numMutations; i++) {
        if (count.items === 0 || (count.items < config.maxItems && Math.random() < 0.5)) {
          const item = await itemManager.createItem('test', TestModel.type);
          log('Created Item:', item.id);
          count.items++;
        } else {
          const item = chance.pickone(itemManager.getItems());
          log('Mutating Item:', item.id);
          await item.model.setProperty(chance.pickone(['a', 'b', 'c']), `value-${i}`);
          count.mutations++;
        }
      }

      await counter;
      await feedStore.close();
    }

    log('Config:', config);
    log('Count:', count);

    //
    // Replay items.
    //
    {
      const feedStore = new FeedStore(directory, { feedOptions: { valueEncoding: codec } });
      await feedStore.open();

      const descriptors = feedStore.getDescriptors();
      expect(descriptors).toHaveLength(config.numFeeds);
      const descriptor = chance.pickone(descriptors);
      const feed = await descriptor.open();

      const itemManager = new ItemManager(modelFactory, createWritableFeedStream(feed));

      const created = sink(itemManager, 'create', count.items);
      const updated = sink(itemManager, 'update', count.mutations);

      const readable = feedStore.createReadStream({ live: true });
      readable.pipe(createItemDemuxer(itemManager));

      // Wait for mutations to be processed.
      await created;
      await updated;

      // TODO(burdon): Test items have same state.
      const items = itemManager.getItems();
      for (const item of items) {
        log((item.model as TestModel).value);
      }

      await feedStore.close();
    }
  });

  test('timestamp writer', () => {
    const ownFeed = randomBytes();
    const feed1Key = randomBytes();
    const feed2Key = randomBytes();

    const [inboundTransfrom, outboundTransfrom] = createTimestampTransform(ownFeed);
    const writtenMessages = collect(outboundTransfrom);

    outboundTransfrom.write({ message: { __type_url: 'dxos.echo.testing.ItemEnvelope' } }); // current timestamp = {}
    inboundTransfrom.write(createTestMessageWithTimestamp(new LogicalClockStamp(), feed1Key, 1)); // current timestamp = { F1: 1 }
    outboundTransfrom.write({ message: { __type_url: 'dxos.echo.testing.ItemEnvelope' } }); // current timestamp = { F1: 1 }
    inboundTransfrom.write(createTestMessageWithTimestamp(new LogicalClockStamp(), feed1Key, 2)); // current timestamp = { F1: 2 }
    outboundTransfrom.write({ message: { __type_url: 'dxos.echo.testing.ItemEnvelope' } }); // current timestamp = { F1: 2 }
    inboundTransfrom.write(createTestMessageWithTimestamp(new LogicalClockStamp([[feed2Key, 1]]), feed1Key, 3)); // current timestamp = { F1: 3, F2: 1 }
    outboundTransfrom.write({ message: { __type_url: 'dxos.echo.testing.ItemEnvelope' } }); // current timestamp = { F1: 3, F2: 1 }
    inboundTransfrom.write(createTestMessageWithTimestamp(new LogicalClockStamp(), feed2Key, 1)); // current timestamp = { F1: 3, F2: 1 }
    outboundTransfrom.write({ message: { __type_url: 'dxos.echo.testing.ItemEnvelope' } }); // current timestamp = { F1: 3, F2: 1 }

    expect(writtenMessages).toEqual([
      { message: { __type_url: 'dxos.echo.testing.ItemEnvelope', timestamp: LogicalClockStamp.encode(LogicalClockStamp.zero()) } },
      { message: { __type_url: 'dxos.echo.testing.ItemEnvelope', timestamp: LogicalClockStamp.encode(new LogicalClockStamp([[feed1Key, 1]])) } },
      { message: { __type_url: 'dxos.echo.testing.ItemEnvelope', timestamp: LogicalClockStamp.encode(new LogicalClockStamp([[feed1Key, 2]])) } },
      { message: { __type_url: 'dxos.echo.testing.ItemEnvelope', timestamp: LogicalClockStamp.encode(new LogicalClockStamp([[feed1Key, 3], [feed2Key, 1]])) } },
      { message: { __type_url: 'dxos.echo.testing.ItemEnvelope', timestamp: LogicalClockStamp.encode(new LogicalClockStamp([[feed1Key, 3], [feed2Key, 1]])) } }
    ]);
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

    const set = new Set<Uint8Array>();
    set.add(descriptors[0].feedKey);

    const streams = [
      createWritableFeedStream(feeds[0]),
      createWritableFeedStream(feeds[1]),
      createWritableFeedStream(feeds[2])
    ];

    const itemIds = [
      createId()
    ];

    const [inboundTransfrom, outboundTransform] = createTimestampTransform(descriptors[0].key);
    const itemManager = new ItemManager(modelFactory, outboundTransform.pipe(streams[0]));

    // Set-up pipeline.
    // TODO(burdon): Test closing pipeline.
    const partyMuxer = createPartyMuxer(feedStore, [descriptors[0].key]);
    const itemDemuxer = createItemDemuxer(itemManager);
    partyMuxer.pipe(inboundTransfrom).pipe(itemDemuxer);

    {
      streams[0].write(createItemGenesis(itemIds[0], 'test'));
      streams[0].write(createItemMutation(itemIds[0], 'title', 'Value-1'));
      streams[1].write(createItemMutation(itemIds[0], 'title', 'Value-2')); // Hold.

      await sink(itemManager, 'create', 1);
      await sink(itemManager, 'update', 1);

      const items = itemManager.getItems();
      expect(items).toHaveLength(1);
      expect((items[0].model as TestModel).getValue('title')).toEqual('Value-1');
    }

    {
      streams[0].write(createItemMutation(itemIds[0], 'title', 'Value-3'));

      await sink(itemManager, 'update', 1);

      const items = itemManager.getItems();
      expect(items).toHaveLength(1);
      expect((items[0].model as TestModel).getValue('title')).toEqual('Value-3');
    }

    {
      streams[0].write(createAdmit(descriptors[1].key));

      await sink(itemManager, 'update', 1);

      const items = itemManager.getItems();
      expect(items).toHaveLength(1);
      expect((items[0].model as TestModel).getValue('title')).toEqual('Value-2');
    }
  });

  test('ordering', async () => {
    const modelFactory = new ModelFactory().registerModel(TestModel.type, TestModel);

    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();

    const feeds = [
      await feedStore.openFeed('feed-1'),
      await feedStore.openFeed('feed-2')
    ];

    const descriptors = [
      feedStore.getOpenFeed((descriptor: any) => descriptor.path === 'feed-1'),
      feedStore.getOpenFeed((descriptor: any) => descriptor.path === 'feed-2')
    ];

    const set = new Set<Uint8Array>();
    set.add(descriptors[0].feedKey);

    const streams = [
      createWritableFeedStream(feeds[0]),
      createWritableFeedStream(feeds[1])
    ];

    const itemIds = [
      createId(),
      createId()
    ];

    const [inboundTransfrom, outboundTransform] = createTimestampTransform(descriptors[0].key);
    const itemManager = new ItemManager(modelFactory, outboundTransform.pipe(streams[0]));

    // Set-up pipeline.
    // TODO(burdon): Test closing pipeline.
    const partyMuxer = createPartyMuxer(feedStore, [descriptors[0].key, descriptors[1].key]);
    const itemDemuxer = createItemDemuxer(itemManager);
    partyMuxer.pipe(inboundTransfrom).pipe(itemDemuxer);

    {
      const timestamp = new LogicalClockStamp([[descriptors[1].key, 1]]); // require feed 2 to have 2 messages
      streams[0].write(createItemGenesis(itemIds[0], 'test', timestamp));
      streams[0].write(createItemMutation(itemIds[0], 'title', 'Value-1', timestamp));

      await sleep(10); // TODO(marik-d): Is threre a better way to do this?

      const items = itemManager.getItems();
      expect(items).toHaveLength(0);
    }

    {
      streams[1].write(createItemGenesis(itemIds[1], 'test'));
      streams[1].write(createItemMutation(itemIds[1], 'title', 'Value-1'));

      await sink(itemManager, 'create', 2);
      await sink(itemManager, 'update', 2);

      const items = itemManager.getItems();
      expect(items).toHaveLength(2);
    }
  });
});
