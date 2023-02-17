//
// Copyright 2023 DXOS.org
//

import expect from 'expect';

import { DocumentModel, MutationBuilder } from '@dxos/document-model';
import { createModelMutation, encodeModelMutation, genesisMutation } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { test } from '@dxos/test';

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

describe('database', () => {
  describe('proxy-service mode', () => {
    test('create object', async () => {
      const database = await createDatabase();

      const result = database.backend.mutate(genesisMutation(PublicKey.random().toHex(), DocumentModel.meta.type));
      expect(result.objectsCreated.length).toEqual(1);
      expect(database.itemManager.entities.has(result.objectsCreated[0].id));

      await (await result.getReceipt()).waitToBeProcessed();
      expect(database.itemManager.entities.has(result.objectsCreated[0].id));
    });

    test('mutate document', async () => {
      const database = await createDatabase();

      const id = PublicKey.random().toHex();
      database.backend.mutate(genesisMutation(id, DocumentModel.meta.type));
      const result = database.backend.mutate(
        createModelMutation(id, encodeModelMutation(DocumentModel.meta, new MutationBuilder().set('test', 42).build()))
      );
      expect(database.itemManager.getItem(id)!.state.data.test).toEqual(42);

      await (await result.getReceipt()).waitToBeProcessed();
      expect(database.itemManager.getItem(id)!.state.data.test).toEqual(42);
    });
  });
});
