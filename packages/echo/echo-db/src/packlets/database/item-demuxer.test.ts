//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';

import { latch } from '@dxos/async';
import { createId } from '@dxos/crypto';
import { checkType } from '@dxos/debug';
import { EchoEnvelope, MockFeedWriter } from '@dxos/echo-protocol';
import { ModelFactory, TestModel } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey, Timeframe } from '@dxos/protocols';

import { Item } from './item';
import { ItemDemuxer } from './item-demuxer';
import { ItemManager } from './item-manager';

const log = debug('dxos:echo:item-demuxer:test');

describe('Item demuxer', () => {
  test('set-up', async () => {
    const memberKey = PublicKey.random();

    const modelFactory = new ModelFactory()
      .registerModel(TestModel);

    const feedWriter = new MockFeedWriter();
    const itemManager = new ItemManager(modelFactory, PublicKey.random(), feedWriter);
    const itemDemuxer = new ItemDemuxer(itemManager, modelFactory);

    const inboundStream = itemDemuxer.open();
    feedWriter.written.on(([msg, meta]) => inboundStream({
      data: msg,
      meta: { ...meta, memberKey }
    } as any));

    //
    // Query for items.
    //

    const [updatedItems, onUpdateItem] = latch();
    const unsubscribe = itemManager.update.on(() => {
      const items = Array.from(itemManager.entities.values()).filter(entity => entity instanceof Item);
      expect(items).toHaveLength(1);
      onUpdateItem();
    });

    const itemId = createId();
    const message: EchoEnvelope = {
      itemId,
      genesis: {
        itemType: 'dxos:item/test',
        modelType: TestModel.meta.type
      }
    };
    await feedWriter.write(message);

    //
    // Wait for mutations to be processed.
    //

    await updatedItems;

    //
    // Update item (causes mutation to be propagated).
    //

    const item = itemManager.getItem(itemId);
    expect(item).toBeTruthy();

    const [updated, onUpdate] = latch();
    const model: TestModel = item?.model as TestModel;
    model.subscribe(model => {
      expect((model as TestModel).keys.length).toBe(1);
      onUpdate();
    });

    await model.set('title', 'Hello');

    //
    // Wait for model mutation to propagate.
    // TODO(burdon): Should trigger itemManager update?
    //

    await updated;

    log('Properties', model.keys);
    expect(model.keys.length).toBe(1);
    unsubscribe();
  });

  it('models can be registered after item was already created', async () => {
    const modelFactory = new ModelFactory()
      .registerModel(ObjectModel);

    const itemManager = new ItemManager(modelFactory, PublicKey.random(), {
      write: async (message) => {
        void processEchoMessage(message);
        return { feedKey: PublicKey.random(), seq: 0 };
      }
    });
    const itemDemuxer = new ItemDemuxer(itemManager, modelFactory);
    const processor = itemDemuxer.open();
    const processEchoMessage = (message: EchoEnvelope) => processor({
      meta: {
        feedKey: PublicKey.random(),
        memberKey: PublicKey.random(),
        seq: 0,
        timeframe: new Timeframe()
      },
      data: message
    });

    void processEchoMessage(checkType<EchoEnvelope>({
      itemId: 'foo',
      genesis: {
        modelType: TestModel.meta.type
      }
    }));
    void processEchoMessage(checkType<EchoEnvelope>({
      itemId: 'bar',
      genesis: {
        modelType: ObjectModel.meta.type
      }
    }));

    {
      await itemManager.update.waitForCount(1);
      const items = itemManager.items;
      expect(items[0].model).toBe(null);
      expect(items[1].model).toBeInstanceOf(ObjectModel);
    }

    modelFactory.registerModel(TestModel);

    {
      await itemManager.update.waitForCount(1);
      const item = itemManager.entities.get('foo');
      expect(item).toBeDefined();
      expect(item!.model).toBeInstanceOf(TestModel);
    }
  });
});
