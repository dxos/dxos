//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { createId } from '@dxos/crypto';
import { MockFeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';

import { ItemManager } from './item-manager';

describe('ItemManager', function () {
  describe('basic', function () {
    it('item construction', async function () {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, PublicKey.random(), new MockFeedWriter());

      const itemId = createId();
      const item = await itemManager.constructItem({
        itemId,
        modelType: ObjectModel.meta.type,
        itemType: undefined,
        snapshot: {}
      });
      expect(item.id).toEqual(itemId);
      expect(item.model).toBeInstanceOf(ObjectModel);
      expect(item.type).toBeUndefined();
      expect(item.readOnly).toBeFalsy();

      expect(itemManager.entities.size).toEqual(1);
      expect(itemManager.entities.get(itemId)).toEqual(item);
    });

    it('item deconstruction', async function () {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, PublicKey.random(), new MockFeedWriter());

      const item = await itemManager.constructItem(defaultOpts());
      expect(itemManager.entities.size).toEqual(1);

      itemManager.deconstructItem(item.id);
      expect(itemManager.entities.size).toEqual(0);
    });
  });

  describe('parent-child relationship', function () {
    it('can be constructed and will have correct references', async function () {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, PublicKey.random(), new MockFeedWriter());

      const parent = await itemManager.constructItem(defaultOpts());
      const child = await itemManager.constructItem({
        ...defaultOpts(),
        parentId: parent.id
      });

      expect(child.parent).toEqual(parent);
      expect(parent.children).toEqual([child]);
    });

    it('when child is deleted parent no longer references it', async function () {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, PublicKey.random(), new MockFeedWriter());

      const parent = await itemManager.constructItem(defaultOpts());
      const child = await itemManager.constructItem({
        ...defaultOpts(),
        parentId: parent.id
      });

      itemManager.deconstructItem(child.id);

      expect(itemManager.entities.size).toEqual(1);
      expect(parent.children.length).toEqual(0);
    });

    it('when parent is deleted children are deleted as well', async function () {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, PublicKey.random(), new MockFeedWriter());

      const parent = await itemManager.constructItem(defaultOpts());
      await itemManager.constructItem({
        ...defaultOpts(),
        parentId: parent.id
      });
      await itemManager.constructItem({
        ...defaultOpts(),
        parentId: parent.id
      });

      expect(itemManager.entities.size).toEqual(3);
      expect(parent.children.length).toEqual(2);

      itemManager.deconstructItem(parent.id);

      expect(itemManager.entities.size).toEqual(0);
    });
  });

  describe('links', function () {
    it('can be constructed and will have correct references', async function () {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, PublicKey.random(), new MockFeedWriter());

      const source = await itemManager.constructItem(defaultOpts());
      const target = await itemManager.constructItem(defaultOpts());

      const link = await itemManager.constructLink({
        ...defaultOpts(),
        source: source.id,
        target: target.id
      });
      expect(itemManager.entities.size).toEqual(3);

      expect(link.source).toStrictEqual(source);
      expect(link.target).toStrictEqual(target);

      expect(source.links).toHaveLength(1);
      expect(target.refs).toHaveLength(1);
      expect(source.links[0]).toStrictEqual(link);
      expect(target.refs[0]).toStrictEqual(link);
    });

    it('target can be dangling', async function () {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, PublicKey.random(), new MockFeedWriter());

      const source = await itemManager.constructItem(defaultOpts());

      const link = await itemManager.constructLink({
        ...defaultOpts(),
        source: source.id,
        target: createId()
      });
      expect(link.source).toEqual(source);
      expect(() => link.target).toThrow();
      expect(source.links).toEqual([]);
    });

    it('source can be dangling', async function () {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, PublicKey.random(), new MockFeedWriter());

      const target = await itemManager.constructItem(defaultOpts());

      const link = await itemManager.constructLink({
        ...defaultOpts(),
        source: createId(),
        target: target.id
      });
      expect(() => link.source).toThrow();
      expect(link.target).toEqual(target);
      expect(target.refs).toEqual([]);
    });

    it('can become dangling', async function () {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const itemManager = new ItemManager(modelFactory, PublicKey.random(), new MockFeedWriter());

      const source = await itemManager.constructItem(defaultOpts());
      const target = await itemManager.constructItem(defaultOpts());

      await itemManager.constructLink({
        ...defaultOpts(),
        source: source.id,
        target: target.id
      });
      expect(itemManager.entities.size).toEqual(3);

      itemManager.deconstructItem(target.id);

      expect(source.links).toEqual([]);
    });
  });

  it('item can be created and the model registered later', async function () {
    const modelFactory = new ModelFactory();
    const itemManager = new ItemManager(modelFactory, PublicKey.random(), new MockFeedWriter());

    const item = await itemManager.constructItem({
      itemId: createId(),
      modelType: ObjectModel.meta.type,
      itemType: undefined,
      snapshot: {}
    });

    expect(item.model).toBe(null);

    modelFactory.registerModel(ObjectModel);
    await itemManager.initializeModel(item.id);

    const reconstructedItem = itemManager.entities.get(item.id)!;
    expect(reconstructedItem.model).toBeInstanceOf(ObjectModel);

    expect(reconstructedItem.modelMeta.type).toEqual(ObjectModel.meta.type);
  });
});

const defaultOpts = () => ({
  itemId: createId(),
  modelType: ObjectModel.meta.type,
  itemType: undefined,
  snapshot: {}
});
