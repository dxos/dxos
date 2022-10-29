//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { asyncTimeout } from '@dxos/async';
import { ModelFactory, TestListModel } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { afterTest } from '@dxos/testutils';

import { DataServiceHost } from './data-service-host';
import { Item } from './item';
import { ItemFilterDeleted } from './selection';
import { createInMemoryDatabase, createRemoteDatabaseFromDataServiceHost } from './testing';

const OBJECT_ORG = 'example:object/org';
const OBJECT_PERSON = 'example:object/person';
const LINK_EMPLOYEE = 'example:link/employee';

describe('Database', function () {
  describe('remote', function () {
    const setupBackend = async (modelFactory: ModelFactory) => {
      const backend = await createInMemoryDatabase(modelFactory);
      afterTest(() => backend.destroy());
      return backend;
    };

    const setupFrontend = async (modelFactory: ModelFactory, dataServiceHost: DataServiceHost) => {
      const frontend = await createRemoteDatabaseFromDataServiceHost(modelFactory, dataServiceHost);
      afterTest(() => frontend.destroy());
      return frontend;
    };

    const setupDatabase = async () => {
      const modelFactory = new ModelFactory().registerModel(ObjectModel).registerModel(TestListModel);
      const backend = await setupBackend(modelFactory);
      const frontend = await setupFrontend(modelFactory, backend.createDataServiceHost());
      return { backend, frontend };
    };

    it('gets items synced from backend', async function () {
      const { backend, frontend } = await setupDatabase();

      const [, backendItem] = await Promise.all([
        frontend.update.waitForCount(1),
        backend.createItem({ model: ObjectModel })
      ]);

      const item = frontend.getItem(backendItem.id);

      expect(item).not.toBeUndefined();
      expect(item!.model).toBeInstanceOf(ObjectModel);

      // Mutate model
      await Promise.all([item!.model.update.waitForCount(1), backendItem.model.set('foo', 'bar')]);

      expect(item!.model.get('foo')).toEqual('bar');
    });

    it('gets items synced from backend that were created before frontend was connected', async function () {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);
      const backend = await setupBackend(modelFactory);

      const backendItem = await backend.createItem({ model: ObjectModel });

      const frontend = await setupFrontend(modelFactory, backend.createDataServiceHost());

      const item = await frontend.waitForItem((item) => item.id === backendItem.id);
      expect(item.model).toBeInstanceOf(ObjectModel);
    });

    it('create item', async function () {
      const { frontend: database } = await setupDatabase();

      const item = await database.createItem({ model: ObjectModel });
      expect(item.id).not.toBeUndefined();
      expect(item.model).toBeInstanceOf(ObjectModel);

      const result = database.select().exec();
      expect(result.expectOne()).toBeTruthy();
    });

    it('mutate item with object model', async function () {
      const { frontend: database } = await setupDatabase();

      const item = await database.createItem({ model: ObjectModel });
      expect(item.model.get('foo')).toBeUndefined();

      await item.model.set('foo', 'bar');
      expect(item.model.get('foo')).toEqual('bar');
    });

    it('creates two items with ObjectModel', async function () {
      const { frontend: database } = await setupDatabase();

      const item1 = await database.createItem({
        model: ObjectModel,
        type: 'test'
      });
      await item1.model.set('prop1', 'x');
      const item2 = await database.createItem({
        model: ObjectModel,
        type: 'test'
      });
      await item2.model.set('prop1', 'y');

      expect(item1.model.get('prop1')).toEqual('x');
    });

    it('parent & child items', async function () {
      const { frontend: database } = await setupDatabase();

      const parent = await database.createItem({ model: ObjectModel });
      const child = await database.createItem({
        model: ObjectModel,
        parent: parent.id
      });

      const result = database.select().exec();
      expect(result.entities).toHaveLength(2);
      expect(result.entities).toEqual([parent, child]);

      expect(parent.children).toHaveLength(1);
      expect(parent.children[0] === child).toBeTruthy();
    });

    it('delete & restore an item', async function () {
      const { backend: database } = await setupDatabase(); // TODO(dmaretskyi): Make work in remote mode.

      const item = await database.createItem({ model: ObjectModel });
      expect(item.deleted).toBeFalsy();

      await item.delete();
      expect(item.deleted).toBeTruthy();

      await item.restore();
      expect(item.deleted).toBeFalsy();
    });

    it('link', async function () {
      const { frontend: database } = await setupDatabase();

      const source = await database.createItem({ model: ObjectModel });
      const target = await database.createItem({ model: ObjectModel });

      const link = await database.createLink({ source, target });

      expect(link.source).toBe(source);
      expect(link.target).toBe(target);
    });

    it('directed links', async function () {
      const { frontend: database } = await setupDatabase();

      const p1 = await database.createItem({
        model: ObjectModel,
        type: OBJECT_PERSON,
        props: { name: 'Person-1' }
      });
      const p2 = await database.createItem({
        model: ObjectModel,
        type: OBJECT_PERSON,
        props: { name: 'Person-2' }
      });

      const org1 = await database.createItem({
        model: ObjectModel,
        type: OBJECT_ORG,
        props: { name: 'Org-1' }
      });
      const org2 = await database.createItem({
        model: ObjectModel,
        type: OBJECT_ORG,
        props: { name: 'Org-2' }
      });

      await database.createLink({
        source: org1,
        type: LINK_EMPLOYEE,
        target: p1
      });
      await database.createLink({
        source: org1,
        type: LINK_EMPLOYEE,
        target: p2
      });
      await database.createLink({
        source: org2,
        type: LINK_EMPLOYEE,
        target: p2
      });

      // Find all employees for org.
      expect(org1.links.filter((link) => link.type === LINK_EMPLOYEE).map((link) => link.target)).toStrictEqual([
        p1,
        p2
      ]);

      // Find all orgs for person.
      expect(p2.refs.filter((link) => link.type === LINK_EMPLOYEE).map((link) => link.source)).toStrictEqual([
        org1,
        org2
      ]);
    });

    describe('non-idempotent models', function () {
      it('messages written from frontend', async function () {
        const { frontend: database } = await setupDatabase();

        const item = await database.createItem({ model: TestListModel });
        expect(item.model.messages).toHaveLength(0);

        await item.model.sendMessage('foo');
        expect(item.model.messages).toHaveLength(1);

        await item.model.sendMessage('bar');
        expect(item.model.messages).toHaveLength(2);
      });

      it('messages written from backend', async function () {
        const { frontend, backend } = await setupDatabase();

        const backendItem = await backend.createItem({ model: TestListModel });

        await backendItem.model.sendMessage('foo');
        await backendItem.model.sendMessage('bar');

        const frontendItem: Item<TestListModel> = await frontend.waitForItem((item) => item.id === backendItem.id);
        await frontendItem.model.update.waitForCondition(() => frontendItem.model.messages.length === 2);

        expect(frontendItem.model.messages).toHaveLength(2);
      });
    });

    describe('queries', function () {
      it('wait for item', async function () {
        const modelFactory = new ModelFactory().registerModel(ObjectModel).registerModel(TestListModel);
        const database = await setupBackend(modelFactory);

        {
          const waiting = database.waitForItem({ type: 'example:type/test-1' });
          const item = await database.createItem({
            model: ObjectModel,
            type: 'example:type/test-1'
          });
          expect(await asyncTimeout(waiting, 100, new Error('timeout'))).toEqual(item);
        }

        {
          const item = await database.createItem({
            model: ObjectModel,
            type: 'example:type/test-2'
          });
          const waiting = database.waitForItem({ type: 'example:type/test-2' });
          expect(await asyncTimeout(waiting, 100, new Error('timeout'))).toEqual(item);
        }
      });

      it('query deleted items', async function () {
        const modelFactory = new ModelFactory().registerModel(ObjectModel).registerModel(TestListModel);
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

      it('link between items generates updates to items', async function () {
        const modelFactory = new ModelFactory().registerModel(ObjectModel).registerModel(TestListModel);
        const database = await setupBackend(modelFactory);

        const item1 = await database.createItem({ model: ObjectModel });
        const item2 = await database.createItem({ model: ObjectModel });

        // 1. Create a query
        const query = database.select().exec();
        const update = query.update.waitForCount(1);

        // 2. Create a link
        await database.createLink({
          model: ObjectModel,
          source: item1,
          target: item2
        });
        expect(item1.links.length).toEqual(1);
        expect(item2.refs.length).toEqual(1);

        // 3. Expect an update
        await asyncTimeout(update, 100, new Error('timeout'));
      });

      it('adding an item emits update for parent', async function () {
        const modelFactory = new ModelFactory().registerModel(ObjectModel).registerModel(TestListModel);
        const database = await setupBackend(modelFactory);

        const parentItem = await database.createItem({ model: ObjectModel });

        const query = database.select({ id: parentItem.id }).exec();
        const update = query.update.waitForCount(1);

        const childItem = await database.createItem({
          model: ObjectModel,
          parent: parentItem.id
        });
        expect(childItem.parent?.id).toEqual(parentItem.id);
        await asyncTimeout(update, 100, new Error('timeout'));
      });
    });

    describe('reducer', function () {
      it('simple counter', async function () {
        const modelFactory = new ModelFactory().registerModel(ObjectModel);
        const database = await setupBackend(modelFactory);

        await Promise.all(Array.from({ length: 8 }).map(() => database.createItem({ model: ObjectModel })));
        const { value } = database
          .reduce(0)
          .call((items) => items.length)
          .exec();
        expect(value).toBe(8);
      });
    });
  });
});
