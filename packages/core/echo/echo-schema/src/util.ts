//
// Copyright 2022 DXOS.org
//

import { createMemoryDatabase } from '@dxos/echo-db/testing';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';

import { EchoDatabase } from './database';
import { DatabaseRouter } from './database-router';

/**
 * Remove keys with undefined values.
 */
export const strip = (obj: any): any => {
  if (typeof obj === 'object') {
    Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);
  }

  return obj;
};

export const createDatabase = async () => {
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const database = await createMemoryDatabase(modelFactory);
  const router = new DatabaseRouter();
  return new EchoDatabase(router, database);
};
