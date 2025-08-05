//
// Copyright 2021 DXOS.org
//

import path from 'path';

import del from 'del';
import { afterAll, beforeAll, describe } from 'vitest';

import { StorageType } from '../common';
import { storageBenchmark } from '../testing/benchmark.blueprint-test';

import { createStorage } from './storage';

const ROOT_DIRECTORY = path.resolve(path.join(__dirname, '../out', 'testing'));

/**
 * Node file system specific tests.
 */
describe.skip('storage benchmark', () => {
  beforeAll(async () => {
    await del(ROOT_DIRECTORY);
  });

  afterAll(async () => {
    await del(ROOT_DIRECTORY);
  });

  for (const dataStore of [StorageType.RAM, StorageType.NODE] as StorageType[]) {
    storageBenchmark('node', dataStore, () => createStorage({ type: dataStore, root: ROOT_DIRECTORY }));
  }
});
