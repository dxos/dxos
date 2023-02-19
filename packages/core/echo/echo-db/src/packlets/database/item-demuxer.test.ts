//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { latch } from '@dxos/async';
import { checkType, todo } from '@dxos/debug';
import { DocumentModel } from '@dxos/document-model';
import { MockFeedWriter } from '@dxos/feed-store/testing';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory, TestModel } from '@dxos/model-factory';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { describe, test } from '@dxos/test';
import { Timeframe } from '@dxos/timeframe';

import { Item } from './item';
import { ItemDemuxer } from './item-demuxer';
import { ItemManager } from './item-manager';

describe('Item demuxer', () => {
  test.skip('set-up', async () => {
    const memberKey = PublicKey.random();

    const modelFactory = new ModelFactory().registerModel(TestModel);

    const feedWriter = new MockFeedWriter<DataMessage>();
    const itemManager = new ItemManager(modelFactory);
    const itemDemuxer = new ItemDemuxer(itemManager, modelFactory);

    const inboundStream = itemDemuxer.open();
    feedWriter.written.on(([msg, meta]) =>
      inboundStream({
        data: msg.object,
        meta: { ...meta, memberKey }
      } as any)
    );

    //
    // Query for items.
    //

    const [updatedItems, onUpdateItem] = latch();
    const unsubscribe = itemManager.update.on(() => {
      const items = Array.from(itemManager.entities.values()).filter((entity) => entity instanceof Item);
      expect(items).toHaveLength(1);
      onUpdateItem();
    });

    const objectId = PublicKey.random().toHex();
    const message: DataMessage = {
      object: {
        objectId,
        genesis: {
          modelType: TestModel.meta.type
        }
      }
    };

    await feedWriter.write(message);

    //
    // Wait for mutations to be processed.
    //

    await updatedItems();

    //
    // Update item (causes mutation to be propagated).
    //

    const item = itemManager.getItem(objectId);
    expect(item).toBeTruthy();

    const [updated, onUpdate] = latch();
    const model: TestModel = todo(); // item?.model as TestModel;
    model.subscribe((model) => {
      expect((model as TestModel).keys.length).toBe(1);
      onUpdate();
    });

    await model.set('title', 'Hello');

    //
    // Wait for model mutation to propagate.
    // TODO(burdon): Should trigger itemManager update?
    //

    await updated();

    log('Properties', model.keys);
    expect(model.keys.length).toBe(1);
    unsubscribe();
  });

  test.skip('models can be registered after item was already created', async () => {
    const modelFactory = new ModelFactory().registerModel(DocumentModel);

    // TODO(burdon): Create mock.
    const itemManager = new ItemManager(modelFactory);

    const itemDemuxer = new ItemDemuxer(itemManager, modelFactory);
    const processor = itemDemuxer.open();
    const processEchoMessage = (message: DataMessage) =>
      processor({
        meta: {
          feedKey: PublicKey.random(),
          memberKey: PublicKey.random(),
          seq: 0,
          timeframe: new Timeframe()
        },
        data: message.object
      });

    void processEchoMessage(
      checkType<DataMessage>({
        object: {
          objectId: 'foo',
          genesis: {
            modelType: TestModel.meta.type
          }
        }
      })
    );

    void processEchoMessage(
      checkType<DataMessage>({
        object: {
          objectId: 'bar',
          genesis: {
            modelType: DocumentModel.meta.type
          }
        }
      })
    );

    // {
    //   await itemManager.update.waitForCount(1);
    //   const items = itemManager.items;
    //   expect(items[0].model).toBe(null);
    //   expect(items[1].model).toBeInstanceOf(DocumentModel);
    // }

    // modelFactory.registerModel(TestModel);

    // {
    //   await itemManager.update.waitForCount(1);
    //   const item = itemManager.entities.get('foo');
    //   expect(item).toBeDefined();
    //   expect(item!.model).toBeInstanceOf(TestModel);
    // }
  });
});
