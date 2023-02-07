//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { asyncTimeout } from '@dxos/async';
import { ModelFactory, TestListModel } from '@dxos/model-factory';
import { DocumentModel } from '@dxos/object-model';
import { describe, test, afterTest } from '@dxos/test';

import { createMemoryDatabase, createRemoteDatabaseFromDataServiceHost } from '../testing';
import { DataServiceHost } from './data-service-host';
import { Item } from './item';
import { ItemFilterDeleted } from './selection';

describe('Database', () => {
  describe('remote', () => {
    const setupBackend = async (modelFactory: ModelFactory) => {
      const backend = await createMemoryDatabase(modelFactory);
      afterTest(() => backend.destroy());
      return backend;
    };

    const setupFrontend = async (modelFactory: ModelFactory, dataServiceHost: DataServiceHost) => {
      const frontend = await createRemoteDatabaseFromDataServiceHost(modelFactory, dataServiceHost);
      afterTest(() => frontend.destroy());
      return frontend;
    };

    const setupDatabase = async () => {
      const modelFactory = new ModelFactory().registerModel(DocumentModel).registerModel(TestListModel);
      const backend = await setupBackend(modelFactory);
      const frontend = await setupFrontend(modelFactory, backend.createDataServiceHost());
      return { backend, frontend };
    };

    test('gets items synced from backend', async () => {
      const { backend, frontend } = await setupDatabase();

      const [, backendItem] = await Promise.all([
        frontend.update.waitForCount(1),
        backend.createItem({ model: DocumentModel })
      ]);

      const item = frontend.getItem(backendItem.id);

      expect(item).not.toBeUndefined();
      expect(item!.model).toBeInstanceOf(DocumentModel);

      // Mutate model
      await Promise.all([item!.model.update.waitForCount(1), backendItem.model.set('foo', 'bar')]);

      expect(item!.model.get('foo')).toEqual('bar');
    });

    test('gets items synced from backend that were created before frontend was connected', async () => {
      const modelFactory = new ModelFactory().registerModel(DocumentModel);
      const backend = await setupBackend(modelFactory);

      const backendItem = await backend.createItem({ model: DocumentModel });

      const frontend = await setupFrontend(modelFactory, backend.createDataServiceHost());

      const item = await frontend.waitForItem((item) => item.id === backendItem.id);
      expect(item.model).toBeInstanceOf(DocumentModel);
    });

    test('create item', async () => {
      const { frontend: database } = await setupDatabase();

      const item = await database.createItem({ model: DocumentModel });
      expect(item.id).not.toBeUndefined();
      expect(item.model).toBeInstanceOf(DocumentModel);

      const result = database.select().exec();
      expect(result.expectOne()).toBeTruthy();
    });

    test('mutate item with object model', async () => {
      const { frontend: database } = await setupDatabase();

      const item = await database.createItem({ model: DocumentModel });
      expect(item.model.get('foo')).toBeUndefined();

      await item.model.set('foo', 'bar');
      expect(item.model.get('foo')).toEqual('bar');
    });

    test('creates two items with DocumentModel', async () => {
      const { frontend: database } = await setupDatabase();

      const item1 = await database.createItem({
        model: DocumentModel,
        type: 'test'
      });
      await item1.model.set('prop1', 'x');
      const item2 = await database.createItem({
        model: DocumentModel,
        type: 'test'
      });
      await item2.model.set('prop1', 'y');

      expect(item1.model.get('prop1')).toEqual('x');
    });

    test('parent & child items', async () => {
      const { frontend: database } = await setupDatabase();

      const parent = await database.createItem({ model: DocumentModel });
      const child = await database.createItem({
        model: DocumentModel,
        parent: parent.id
      });

      const result = database.select().exec();
      expect(result.entities).toHaveLength(2);
      expect(result.entities).toEqual([parent, child]);

      expect(parent.children).toHaveLength(1);
      expect(parent.children[0] === child).toBeTruthy();
    });

    test('delete & restore an item', async () => {
      const { backend: database } = await setupDatabase(); // TODO(dmaretskyi): Make work in remote mode.

      const item = await database.createItem({ model: DocumentModel });
      expect(item.deleted).toBeFalsy();

      await item.delete();
      expect(item.deleted).toBeTruthy();

      await item.restore();
      expect(item.deleted).toBeFalsy();
    });

    describe('non-idempotent models', () => {
      test('messages written from frontend', async () => {
        const { frontend: database } = await setupDatabase();

        const item = await database.createItem({ model: TestListModel });
        expect(item.model.messages).toHaveLength(0);

        await item.model.sendMessage('foo');
        expect(item.model.messages).toHaveLength(1);

        await item.model.sendMessage('bar');
        expect(item.model.messages).toHaveLength(2);
      });

      test('messages written from backend', async () => {
        const { frontend, backend } = await setupDatabase();

        const backendItem = await backend.createItem({ model: TestListModel });

        await backendItem.model.sendMessage('foo');
        await backendItem.model.sendMessage('bar');

        const frontendItem: Item<TestListModel> = await frontend.waitForItem((item) => item.id === backendItem.id);
        await frontendItem.model.update.waitForCondition(() => frontendItem.model.messages.length === 2);

        expect(frontendItem.model.messages).toHaveLength(2);
      });
    });

    describe('queries', () => {
      test('wait for item', async () => {
        const modelFactory = new ModelFactory().registerModel(DocumentModel).registerModel(TestListModel);
        const database = await setupBackend(modelFactory);

        {
          const waiting = database.waitForItem({ type: 'example:type/test-1' });
          const item = await database.createItem({
            model: DocumentModel,
            type: 'example:type/test-1'
          });
          expect(await asyncTimeout(waiting, 100, new Error('timeout'))).toEqual(item);
        }

        {
          const item = await database.createItem({
            model: DocumentModel,
            type: 'example:type/test-2'
          });
          const waiting = database.waitForItem({ type: 'example:type/test-2' });
          expect(await asyncTimeout(waiting, 100, new Error('timeout'))).toEqual(item);
        }
      });

      test('query deleted items', async () => {
        const modelFactory = new ModelFactory().registerModel(DocumentModel).registerModel(TestListModel);
        const database = await setupBackend(modelFactory);

        await Promise.all(Array.from({ length: 10 }).map(() => database.createItem({ model: TestListModel })));

        const result = database.select().exec();
        const items = result.entities;
        expect(items).toHaveLength(10);

        const update = result.update.waitForCount(1);
        await items[0].delete();
        await update;

        {
          const result = database.select().exec();
          expect(result.entities).toHaveLength(9);
        }

        {
          const result = database.select().exec({ deleted: ItemFilterDeleted.SHOW_DELETED });
          expect(result.entities).toHaveLength(10);
        }

        {
          const result = database.select().exec({ deleted: ItemFilterDeleted.SHOW_DELETED_ONLY });
          expect(result.entities).toHaveLength(1);
        }
      });

      test('adding an item emits update for parent', async () => {
        const modelFactory = new ModelFactory().registerModel(DocumentModel).registerModel(TestListModel);
        const database = await setupBackend(modelFactory);

        const parentItem = await database.createItem({ model: DocumentModel });

        const query = database.select({ id: parentItem.id }).exec();
        const update = query.update.waitForCount(1);

        const childItem = await database.createItem({
          model: DocumentModel,
          parent: parentItem.id
        });
        expect(childItem.parent?.id).toEqual(parentItem.id);
        await asyncTimeout(update, 100, new Error('timeout'));
      });
    });

    describe('reducer', () => {
      test('simple counter', async () => {
        const modelFactory = new ModelFactory().registerModel(DocumentModel);
        const database = await setupBackend(modelFactory);

        await Promise.all(Array.from({ length: 8 }).map(() => database.createItem({ model: DocumentModel })));
        const { value } = database
          .reduce(0)
          .call((items) => items.length)
          .exec();
        expect(value).toBe(8);
      });
    });
  });
});
