//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';
import { Readable } from 'stream';

import { PublicKey } from '@dxos/crypto';
import { EchoEnvelope, MockFeedWriter } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { afterTest } from '@dxos/testutils';

import { Database } from '..';
import { DataServiceRouter } from './data-service-router';
import { FeedDatabaseBackend, RemoteDatabaseBacked } from './database-backend';

describe('Database', () => {
  describe('remote', () => {
    const setup = async () => {
      const modelFactory = new ModelFactory().registerModel(ObjectModel);

      const feed = new MockFeedWriter<EchoEnvelope>();
      const inboundStream = new Readable({ read () {}, objectMode: true });
      feed.written.on(([data, meta]) => inboundStream.push({ data, meta: { ...meta, memberKey: PublicKey.random() } }));

      const backend = new Database(
        modelFactory,
        new FeedDatabaseBackend(inboundStream, feed, undefined, { snapshots: true })
      );
      await backend.init();
      afterTest(() => backend.destroy());

      const partyKey = PublicKey.random();
      const dataServiceRouter = new DataServiceRouter();
      dataServiceRouter.trackParty(partyKey, backend.createDataServiceHost());

      const frontend = new Database(
        modelFactory,
        new RemoteDatabaseBacked(dataServiceRouter, partyKey)
      );
      await frontend.init();
      afterTest(() => frontend.destroy());

      return { backend, frontend };
    };

    test('gets items synced from backend', async () => {
      const { backend, frontend } = await setup();

      const [, backendItem] = await Promise.all([
        frontend.update.waitForCount(1),
        backend.createItem({ model: ObjectModel })
      ]);

      const item = frontend.getItem(backendItem.id);

      expect(item).not.toBeUndefined();
      expect(item!.model).toBeInstanceOf(ObjectModel);

      // Mutate model
      await Promise.all([
        item!.model.modelUpdate.waitForCount(1),
        backendItem.model.setProperty('foo', 'bar')
      ]);

      expect(item!.model.getProperty('foo')).toEqual('bar');
    });

    test('create item', async () => {
      const { frontend: database } = await setup();

      const item = await database.createItem({ model: ObjectModel });

      expect(item.id).not.toBeUndefined();
      expect(item.model).toBeInstanceOf(ObjectModel);

      const items = database.select(s => s.items).getValue();
      expect(items).toHaveLength(1);
      expect(items[0] === item).toBeTruthy();
    });

    test('mutate item with object model', async () => {
      const { frontend: database } = await setup();

      const item = await database.createItem({ model: ObjectModel });

      expect(item.model.getProperty('foo')).toBeUndefined();

      await item.model.setProperty('foo', 'bar');

      expect(item.model.getProperty('foo')).toEqual('bar');
    });

    test('parent & child items', async () => {
      const { frontend: database } = await setup();

      const parent = await database.createItem({ model: ObjectModel });
      const child = await database.createItem({ model: ObjectModel, parent: parent.id });

      const items = database.select(s => s.items).getValue();
      expect(items).toHaveLength(2);
      expect(items).toEqual([parent, child]);

      expect(parent.children).toHaveLength(1);
      expect(parent.children[0] === child).toBeTruthy();
    });

    test('link', async () => {
      const { frontend: database } = await setup();

      const source = await database.createItem({ model: ObjectModel });
      const target = await database.createItem({ model: ObjectModel });

      const link = await database.createLink({ source, target });

      expect(link.source).toBe(source);
      expect(link.target).toBe(target);
    });
  });
});
