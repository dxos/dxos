//
// Copyright 2021 DXOS.org
//

import { describe } from 'vitest';

import { StorageType } from '../common/index.ts';
import { storageBenchmark } from '../testing/benchmark.blueprint-test.ts';
import { createStorage } from './storage.ts';

const ROOT_DIRECTORY = 'testing';

describe.skip('bench', () => {
  for (const dataStore of [StorageType.RAM, StorageType.IDB] as StorageType[]) {
    storageBenchmark('browser', dataStore, () => createStorage({ type: dataStore, root: ROOT_DIRECTORY }));
  }
});
