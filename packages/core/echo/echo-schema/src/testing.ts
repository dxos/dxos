//
// Copyright 2022 DXOS.org
//

import { DocumentModel } from '@dxos/document-model';
import { DatabaseBackendProxy } from '@dxos/echo-db';
import { createMemoryDatabase, createRemoteDatabaseFromDataServiceHost } from '@dxos/echo-db/testing';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { TextModel } from '@dxos/text-model';

import { EchoDatabase } from './database';
import { DatabaseRouter } from './database-router';

// TODO(burdon): Builder pattern.
// TODO(burdon): Rename createMemoryDatabase.
export const createDatabase = async (router = new DatabaseRouter()) => {
  // prettier-ignore
  const modelFactory = new ModelFactory()
    .registerModel(DocumentModel)
    .registerModel(TextModel);

  // TODO(dmaretskyi): Fix.
  const database = await createMemoryDatabase(modelFactory);
  const database2 = await createRemoteDatabaseFromDataServiceHost(
    modelFactory,
    database.backend.createDataServiceHost()
  );
  const db = new EchoDatabase(database2.itemManager, database2.backend as DatabaseBackendProxy, router);
  router.register(PublicKey.random(), db); // TODO(burdon): Database should have random id?
  return db;
};
