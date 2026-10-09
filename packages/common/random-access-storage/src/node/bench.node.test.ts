//
// Copyright 2021 DXOS.org
//

import del from 'del';
import path from 'path';
import { afterAll, beforeAll, describe } from 'vitest';

import { StorageType } from '../common/index.ts';
import { storageBenchmark } from '../testing/benchmark.blueprint-test.ts';
import { createStorage } from './storage.ts';

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
