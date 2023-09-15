//
// Copyright 2021 DXOS.org
//

// @dxos/test platform=browser

import 'source-map-support/register';

import { describe } from '@dxos/test';

import { createStorage } from './storage';
import { StorageType } from '../common';
import { storageBenchmark } from '../testing/benchmark.blueprint-test';

const ROOT_DIRECTORY = 'testing';

describe.skip('bench', () => {
  for (const dataStore of [StorageType.RAM, StorageType.IDB] as StorageType[]) {
    storageBenchmark(dataStore, () => createStorage({ type: dataStore, root: ROOT_DIRECTORY }));
  }
});
