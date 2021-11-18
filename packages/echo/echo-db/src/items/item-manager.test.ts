//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createId, createKeyPair, PublicKey } from '@dxos/crypto';
import { createFeedWriter, MockFeedWriter } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';

import { ItemManager } from './item-manager';
import { ObjectModel } from '@dxos/object-model';
import { Link } from './link';

describe.only('ItemManager', () => {
  test('item construction', async () => {
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const itemManager = new ItemManager(modelFactory, new MockFeedWriter());

    const itemId = createId();
    const item = await itemManager.constructItem({
      itemId,
      modelType: ObjectModel.meta.type,
      itemType: undefined,
    })

    expect(item.id).toEqual(itemId)
    expect(item.model).toBeInstanceOf(ObjectModel)
    expect(item.type).toBeUndefined()
    expect(item.readOnly).toBeFalsy()

    expect(itemManager.items.size).toEqual(1)
    expect(itemManager.items.get(itemId)).toEqual(item)
  });

  test('item deconstruction', async () => {
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const itemManager = new ItemManager(modelFactory, new MockFeedWriter());

    const item = await itemManager.constructItem({
      itemId: createId(),
      modelType: ObjectModel.meta.type,
      itemType: undefined,
    })

    expect(itemManager.items.size).toEqual(1)

    itemManager.deconstructItem(item.id)

    expect(itemManager.items.size).toEqual(0)
  })

  test('parent & child items', async () => {
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const itemManager = new ItemManager(modelFactory, new MockFeedWriter());

    const parent = await itemManager.constructItem({
      itemId: createId(),
      modelType: ObjectModel.meta.type,
      itemType: undefined,
    })
    const child = await itemManager.constructItem({
      itemId: createId(),
      modelType: ObjectModel.meta.type,
      itemType: undefined,
      parentId: parent.id,
    })

    expect(child.parent).toEqual(parent)
    expect(parent.children).toEqual([child])
  })

  test('links', async () => {
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const itemManager = new ItemManager(modelFactory, new MockFeedWriter());

    const source = await itemManager.constructItem({
      itemId: createId(),
      modelType: ObjectModel.meta.type,
      itemType: undefined,
    })
    const target = await itemManager.constructItem({
      itemId: createId(),
      modelType: ObjectModel.meta.type,
      itemType: undefined,
    })

    const link = await itemManager.constructItem({
      itemId: createId(),
      modelType: ObjectModel.meta.type,
      itemType: undefined,
      link: {
        source: source.id,
        target: target.id,
      }
    }) as Link<any, any, any>

    expect(itemManager.items.size).toEqual(3)

    expect(link.source).toEqual(source)
    expect(link.target).toEqual(target)

    expect(source.links).toEqual([link])
    expect(target.links).toEqual([link])
  })
});
