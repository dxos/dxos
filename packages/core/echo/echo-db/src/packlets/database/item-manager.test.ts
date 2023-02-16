//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { createId } from '@dxos/crypto';
import { DocumentModel } from '@dxos/document-model';
import { MockFeedWriter } from '@dxos/feed-store/testing';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { describe, test } from '@dxos/test';

import { ItemConstructionOptions, ItemManager } from './item-manager';

describe('ItemManager', () => {
  describe('basic', () => {
    test('item construction', async () => {
      const modelFactory = new ModelFactory().registerModel(DocumentModel);
      const itemManager = new ItemManager(modelFactory);

      const itemId = createId();
      const item = await itemManager.constructItem({
        itemId,
        modelType: DocumentModel.meta.type,
      });
      expect(item.id).toEqual(itemId);

      expect(itemManager.entities.size).toEqual(1);
      expect(itemManager.entities.get(itemId)).toEqual(item);
    });

    test('item deconstruction', async () => {
      const modelFactory = new ModelFactory().registerModel(DocumentModel);
      const itemManager = new ItemManager(modelFactory);

      const item = await itemManager.constructItem(defaultOpts());
      expect(itemManager.entities.size).toEqual(1);

      itemManager.deconstructItem(item.id);
      expect(itemManager.entities.size).toEqual(0);
    });
  });

  describe('parent-child relationship', () => {
    test('can be constructed and will have correct references', async () => {
      const modelFactory = new ModelFactory().registerModel(DocumentModel);
      const itemManager = new ItemManager(modelFactory);

      const parent = await itemManager.constructItem(defaultOpts());
      const child = await itemManager.constructItem({
        ...defaultOpts(),
        parentId: parent.id
      });

      expect(child.parent).toEqual(parent);
      expect(parent.children).toEqual([child]);
    });

    test('when child is deleted parent no longer references it', async () => {
      const modelFactory = new ModelFactory().registerModel(DocumentModel);
      const itemManager = new ItemManager(modelFactory);

      const parent = await itemManager.constructItem(defaultOpts());
      const child = await itemManager.constructItem({
        ...defaultOpts(),
        parentId: parent.id
      });

      itemManager.deconstructItem(child.id);

      expect(itemManager.entities.size).toEqual(1);
      expect(parent.children.length).toEqual(0);
    });

    test('when parent is deleted children are deleted as well', async () => {
      const modelFactory = new ModelFactory().registerModel(DocumentModel);
      const itemManager = new ItemManager(modelFactory);

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
});

const defaultOpts = (): ItemConstructionOptions => {
  const itemId = createId();
  return {
    itemId,
    modelType: DocumentModel.meta.type,
  };
};
