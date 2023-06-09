//
// Copyright 2023 DXOS.org
//

import expect from 'expect';

import { DocumentModel, MutationBuilder } from '@dxos/document-model';
import { createModelMutation, DatabaseProxy, encodeModelMutation, genesisMutation, ItemManager } from '@dxos/echo-db';
import { TestBuilder as FeedTestBuilder } from '@dxos/feed-store/testing';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { test } from '@dxos/test';

import { createMappedFeedWriter } from '../common';
import { DatabaseHost, DataServiceImpl, DataServiceSubscriptions } from '../dbhost';
import { createMemoryDatabase, createRemoteDatabaseFromDataServiceHost } from '../testing';

const createDatabase = async () => {
  // prettier-ignore
  const modelFactory = new ModelFactory()
    .registerModel(DocumentModel);

  // TODO(dmaretskyi): Fix.
  const host = await createMemoryDatabase(modelFactory);
  const proxy = await createRemoteDatabaseFromDataServiceHost(modelFactory, host.backend.createDataServiceHost());
  return proxy;
};

const createDatabaseWithFeeds = async () => {
  const modelFactory = new ModelFactory().registerModel(DocumentModel);

  const feedTestBuilder = new FeedTestBuilder();
  const feedStore = feedTestBuilder.createFeedStore();
  const feed = await feedStore.openFeed(await feedTestBuilder.keyring.createKey(), { writable: true });

  const writer = createMappedFeedWriter((data: DataMessage) => ({ data }), feed.createFeedWriter());
  const host = new DatabaseHost(writer);
  await host.open(new ItemManager(modelFactory), new ModelFactory().registerModel(DocumentModel));

  const dataServiceSubscriptions = new DataServiceSubscriptions();
  const dataService = new DataServiceImpl(dataServiceSubscriptions);

  const spaceKey = PublicKey.random();
  dataServiceSubscriptions.registerSpace(spaceKey, host.createDataServiceHost());

  const proxy = new DatabaseProxy(dataService, spaceKey);
  await proxy.open(new ItemManager(modelFactory), new ModelFactory().registerModel(DocumentModel));

  return { proxy, host };
};

describe('database', () => {
  describe('proxy-service mode', () => {
    test('create object', async () => {
      const database = await createDatabase();

      const result = database.backend.mutate(genesisMutation(PublicKey.random().toHex(), DocumentModel.meta.type));
      expect(result.objectsUpdated.length).toEqual(1);
      expect(database.itemManager.entities.has(result.objectsUpdated[0].id));

      await result.batch.waitToBeProcessed();
      expect(database.itemManager.entities.has(result.objectsUpdated[0].id));
    });

    test('mutate document', async () => {
      const database = await createDatabase();

      const id = PublicKey.random().toHex();
      database.backend.mutate(genesisMutation(id, DocumentModel.meta.type));
      const result = database.backend.mutate(
        createModelMutation(id, encodeModelMutation(DocumentModel.meta, new MutationBuilder().set('test', 42).build())),
      );
      expect(database.itemManager.getItem(id)!.state.data.test).toEqual(42);

      await result.batch.waitToBeProcessed();
      expect(database.itemManager.getItem(id)!.state.data.test).toEqual(42);
    });

    // TODO(dmaretskyi): Flush is broken in this mock database.
    test
      .skip('flush', async () => {
        const { proxy } = await createDatabaseWithFeeds();

        const id = PublicKey.random().toHex();
        proxy.mutate(genesisMutation(id, DocumentModel.meta.type));
        await proxy.flush();
      })
      .timeout(100);
  });
});
