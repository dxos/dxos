//
// Copyright 2022 DXOS.org
//

import { createMemoryDatabase } from '@dxos/echo-db/testing';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';

import { EchoDatabase } from './database';
import { DatabaseRouter } from './database-router';

// TODO(burdon): Can't export dep from testing?
export const createDatabase = async () => {
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const database = await createMemoryDatabase(modelFactory);
  const router = new DatabaseRouter();
  return new EchoDatabase(router, database);
};
