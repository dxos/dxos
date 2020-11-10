//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { createId, createKeyPair, randomBytes } from '@dxos/crypto';
import { createMockFeedWriterFromStream, EchoEnvelope, IEchoStream } from '@dxos/echo-protocol';
import { ModelFactory, TestModel } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { checkType, createTransform, latch } from '@dxos/util';

import { Item } from './item';
import { ItemDemuxer } from './item-demuxer';
import { ItemManager } from './item-manager';
import { TimeframeClock } from './timeframe-clock';
import { UnknownModel } from './unknown-model';

const log = debug('dxos:echo:item-demuxer:test');

test('set-up', async () => {
  const { publicKey: feedKey } = createKeyPair();

  const modelFactory = new ModelFactory()
    .registerModel(TestModel)
    .registerModel(UnknownModel);

  const writeStream = createTransform<EchoEnvelope, IEchoStream>(
    async (message: EchoEnvelope): Promise<IEchoStream> => ({
      meta: {
        feedKey,
        memberKey: feedKey,
        seq: 0
      },
      data: message
    })
  );

  const timeframeClock = new TimeframeClock();
  const itemManager = new ItemManager(modelFactory, timeframeClock, createMockFeedWriterFromStream(writeStream));
  const itemDemuxer = new ItemDemuxer(itemManager, modelFactory);
  writeStream.pipe(itemDemuxer.open());

  //
  // Query for items.
  //

  const [updatedItems, onUpdateItem] = latch();
  const items = await itemManager.queryItems();
  const unsubscribe = items.subscribe((items: Item<any>[]) => {
    expect(items).toHaveLength(1);
    onUpdateItem();
  });

  const itemId = createId();
  const message: EchoEnvelope = {
    itemId,
    genesis: {
      itemType: 'wrn://dxos.org/item/test',
      modelType: TestModel.meta.type
    }
  };
  await writeStream.write(message);

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

  await model.setProperty('title', 'Hello');

  //
  // Wait for model mutation to propagate.
  // TODO(burdon): Should trigger itemManager update?
  //

  await updated;

  log('Properties', model.keys);
  expect(model.keys.length).toBe(1);
  unsubscribe();
});

it('ignores unknown models', async () => {
  const modelFactory = new ModelFactory()
    .registerModel(TestModel)
    .registerModel(UnknownModel);

  const writeStream = createTransform<EchoEnvelope, IEchoStream>(
    async (message: EchoEnvelope): Promise<IEchoStream> => ({
      meta: {
        feedKey: randomBytes(),
        memberKey: randomBytes(),
        seq: 0
      },
      data: message
    })
  );
  const timeframeClock = new TimeframeClock();
  const itemManager = new ItemManager(modelFactory, timeframeClock, createMockFeedWriterFromStream(writeStream));
  const itemDemuxer = new ItemDemuxer(itemManager, modelFactory);
  writeStream.pipe(itemDemuxer.open());

  writeStream.write(checkType<EchoEnvelope>({
    itemId: 'foo',
    genesis: {
      modelType: 'unknown model'
    }
  }));
  writeStream.write(checkType<EchoEnvelope>({
    itemId: 'bar',
    genesis: {
      modelType: TestModel.meta.type
    }
  }));
  await itemManager.queryItems().update.waitForCount(1);
  const items = itemManager.queryItems().value;
  expect(items).toHaveLength(1);
  expect(items[0].model).toBeInstanceOf(TestModel);
});

it('ignores unknown models on snapshot restore', async () => {
  const modelFactory = new ModelFactory()
    .registerModel(TestModel)
    .registerModel(UnknownModel);

  const timeframeClock = new TimeframeClock();
  const itemManager = new ItemManager(modelFactory, timeframeClock);
  const itemDemuxer = new ItemDemuxer(itemManager, modelFactory);

  await itemDemuxer.restoreFromSnapshot({
    items: [
      {
        itemId: 'foo',
        modelType: 'unknown model',
        model: {
          array: {
            mutations: [
              {
                mutation: Buffer.from('abc'),
                meta: {
                  feedKey: randomBytes(),
                  memberKey: randomBytes(),
                  seq: 0
                }
              }
            ]
          }
        }
      }
    ]
  });

  expect(itemManager.queryItems().value).toHaveLength(0);
});

it('models can be registered after item was already created', async () => {
  const modelFactory = new ModelFactory()
    .registerModel(ObjectModel)
    .registerModel(UnknownModel);

  const writeStream = createTransform<EchoEnvelope, IEchoStream>(
    async (message: EchoEnvelope): Promise<IEchoStream> => ({
      meta: {
        feedKey: randomBytes(),
        memberKey: randomBytes(),
        seq: 0
      },
      data: message
    })
  );
  const timeframeClock = new TimeframeClock();
  const itemManager = new ItemManager(modelFactory, timeframeClock, createMockFeedWriterFromStream(writeStream));
  const itemDemuxer = new ItemDemuxer(itemManager, modelFactory);
  writeStream.pipe(itemDemuxer.open());

  writeStream.write(checkType<EchoEnvelope>({
    itemId: 'foo',
    genesis: {
      modelType: TestModel.meta.type
    }
  }));
  writeStream.write(checkType<EchoEnvelope>({
    itemId: 'bar',
    genesis: {
      modelType: ObjectModel.meta.type
    }
  }));
  {
    await itemManager.queryItems().update.waitForCount(1);
    const items = itemManager.queryItems().value;
    expect(items).toHaveLength(1);
    expect(items[0].model).toBeInstanceOf(ObjectModel);
  }

  modelFactory.registerModel(TestModel);

  {
    await itemManager.queryItems({ id: 'foo' }).update.waitForCount(1);
    const items = itemManager.queryItems({ id: 'foo' }).value;
    expect(items).toHaveLength(1);
    expect(items[0].model).toBeInstanceOf(TestModel);
  }
});
