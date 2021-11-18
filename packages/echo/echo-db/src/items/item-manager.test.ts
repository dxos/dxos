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
import { DefaultModel, ItemConstructionOptions } from '.';
import exp from 'constants';



describe.only('ItemManager', () => {
  describe('basic', () => {
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

      const item = await itemManager.constructItem(defaultOpts())

      expect(itemManager.items.size).toEqual(1)

      itemManager.deconstructItem(item.id)

      expect(itemManager.items.size).toEqual(0)
    })
  })

  describe('parent-child relationship', () => {
    test('can be constructed and will have correct references', async () => {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, new MockFeedWriter());

      const parent = await itemManager.constructItem(defaultOpts())
      const child = await itemManager.constructItem({ ...defaultOpts(), parentId: parent.id })

      expect(child.parent).toEqual(parent)
      expect(parent.children).toEqual([child])
    })

    test('when child is deleted parent no longer references it', async () => {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, new MockFeedWriter());

      const parent = await itemManager.constructItem(defaultOpts())
      const child = await itemManager.constructItem({ ...defaultOpts(), parentId: parent.id })

      itemManager.deconstructItem(child.id)

      expect(itemManager.items.size).toEqual(1)
      expect(parent.children.length).toEqual(0)
    })

    test('when parent is deleted children are deleted as well', async () => {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, new MockFeedWriter());

      const parent = await itemManager.constructItem(defaultOpts())
      const child1 = await itemManager.constructItem({ ...defaultOpts(), parentId: parent.id })
      const child2 = await itemManager.constructItem({ ...defaultOpts(), parentId: parent.id })

      expect(itemManager.items.size).toEqual(3)
      expect(parent.children.length).toEqual(2)
      
      itemManager.deconstructItem(parent.id)

      expect(itemManager.items.size).toEqual(0)
    })
  })

  describe('links', () => {
    test('can be constructed and will have correct references', async () => {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, new MockFeedWriter());

      const source = await itemManager.constructItem(defaultOpts())
      const target = await itemManager.constructItem(defaultOpts())

      const link = await itemManager.constructItem({
        ...defaultOpts(),
        link: {
          source: source.id,
          target: target.id,
        }
      }) as any as Link<any, any, any>

      expect(itemManager.items.size).toEqual(3)

      expect(link.source).toEqual(source)
      expect(link.target).toEqual(target)

      expect(source.links).toEqual([link])
      expect(target.refs).toEqual([link])
    })

    test('target can be dangling', async () => {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, new MockFeedWriter());

      const source = await itemManager.constructItem(defaultOpts())

      const link = await itemManager.constructItem({
        ...defaultOpts(),
        link: {
          source: source.id,
          target: createId(),
        }
      }) as any as Link<any, any, any>

      expect(link.isDanglingLink).toBeTruthy()
      expect(source.links).toEqual([])
    })

    test('source can be dangling', async () => {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, new MockFeedWriter());

      const target = await itemManager.constructItem(defaultOpts())

      const link = await itemManager.constructItem({
        ...defaultOpts(),
        link: {
          source: createId(),
          target: target.id,
        }
      }) as any as Link<any, any, any>

      expect(link.isDanglingLink).toBeTruthy()
      expect(target.refs).toEqual([])
    })

    test('can become dangling', async () => {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, new MockFeedWriter());

      const source = await itemManager.constructItem(defaultOpts())
      const target = await itemManager.constructItem(defaultOpts())

      const link = await itemManager.constructItem({
        ...defaultOpts(),
        link: {
          source: source.id,
          target: target.id,
        }
      }) as any as Link<any, any, any>

      expect(itemManager.items.size).toEqual(3)

      itemManager.deconstructItem(target.id)

      expect(source.links).toEqual([])
    })
  })

  describe('DefaultModel', () => {
    test('item can be created and the model registered later', async () => {
      const modelFactory = new ModelFactory().registerModel(DefaultModel);
      const itemManager = new ItemManager(modelFactory, new MockFeedWriter());

      const item = await itemManager.constructItem({
        itemId: createId(),
        modelType: DefaultModel.meta.type,
        itemType: undefined,
      })
      item.model.originalModelType = ObjectModel.meta.type;

      expect(item.model).toBeInstanceOf(DefaultModel)

      modelFactory.registerModel(ObjectModel)
      await itemManager.reconstructItemWithDefaultModel(item.id)

      const reconstructedItem = itemManager.items.get(item.id)!
      expect(reconstructedItem.model).toBeInstanceOf(ObjectModel)
    })
  })
});

const defaultOpts = () => ({
  itemId: createId(),
  modelType: ObjectModel.meta.type,
  itemType: undefined,
})