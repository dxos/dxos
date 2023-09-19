//
// Copyright 2021 DXOS.org
//

// @dxos/test platform=nodejs

import del from 'del';
import path from 'path';

import { afterAll, beforeAll, describe } from '@dxos/test';

import { createStorage } from './storage';
import { StorageType } from '../common';
import { storageBenchmark } from '../testing/benchmark.blueprint-test';

const ROOT_DIRECTORY = path.resolve(path.join(__dirname, '../out', 'testing'));

/**
 * Node file system specific tests.
 */
describe.skip('storage benchmark', () => {
  beforeAll(() => del(ROOT_DIRECTORY));

  afterAll(() => del(ROOT_DIRECTORY));

  for (const dataStore of [StorageType.RAM, StorageType.NODE] as StorageType[]) {
    storageBenchmark(dataStore, () => createStorage({ type: dataStore, root: ROOT_DIRECTORY }));
  }
});
