//
// Copyright 2022 DXOS.org
//

import { createMemoryDatabase } from '@dxos/echo-db/testing';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { TextModel } from '@dxos/text-model';

import { EchoDatabase } from './database';
import { DatabaseRouter } from './database-router';

// TODO(burdon): Builder pattern.
// TODO(burdon): Rename createMemoryDatabase.
export const createDatabase = async (router = new DatabaseRouter()) => {
  // prettier-ignore
  const modelFactory = new ModelFactory()
    .registerModel(ObjectModel)
    .registerModel(TextModel);

  const database = await createMemoryDatabase(modelFactory);
  const db = new EchoDatabase(database, router);
  router.register(PublicKey.random(), db); // TODO(burdon): Database should have random id?
  return db;
};
