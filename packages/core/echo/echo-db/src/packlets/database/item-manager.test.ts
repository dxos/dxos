//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { DocumentModel } from '@dxos/document-model';
import { ModelFactory } from '@dxos/model-factory';
import { describe, test } from '@dxos/test';

import { ItemConstructionOptions, ItemManager } from './item-manager';
import { PublicKey } from '@dxos/keys';

describe('ItemManager', () => {
  describe('basic', () => {
    test('item construction', async () => {
      const modelFactory = new ModelFactory().registerModel(DocumentModel);
      const itemManager = new ItemManager(modelFactory);

      const itemId = PublicKey.random().toHex();
      const item = await itemManager.constructItem({
        itemId,
        modelType: DocumentModel.meta.type
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

  describe.skip('parent-child relationship', () => {
    test('can be constructed and will have correct references', async () => {
      const modelFactory = new ModelFactory().registerModel(DocumentModel);
      const itemManager = new ItemManager(modelFactory);

      const parent = await itemManager.constructItem(defaultOpts());
      const child = await itemManager.constructItem({
        ...defaultOpts()
      });

      expect(child.parent).toEqual(parent.id);
    });

    test('when child is deleted parent no longer references it', async () => {
      const modelFactory = new ModelFactory().registerModel(DocumentModel);
      const itemManager = new ItemManager(modelFactory);

      const _parent = await itemManager.constructItem(defaultOpts());
      const child = await itemManager.constructItem({
        ...defaultOpts()
      });

      itemManager.deconstructItem(child.id);

      expect(itemManager.entities.size).toEqual(1);
    });

    test('when parent is deleted children are deleted as well', async () => {
      const modelFactory = new ModelFactory().registerModel(DocumentModel);
      const itemManager = new ItemManager(modelFactory);

      const parent = await itemManager.constructItem(defaultOpts());
      await itemManager.constructItem({
        ...defaultOpts()
      });
      await itemManager.constructItem({
        ...defaultOpts()
      });

      expect(itemManager.entities.size).toEqual(3);

      itemManager.deconstructItem(parent.id);

      expect(itemManager.entities.size).toEqual(0);
    });
  });
});

const defaultOpts = (): ItemConstructionOptions => {
  const itemId = PublicKey.random().toHex();
  return {
    itemId,
    modelType: DocumentModel.meta.type
  };
};
