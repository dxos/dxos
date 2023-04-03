//
// Copyright 2021 DXOS.org
//

// @dxos/test platform=browser

import 'source-map-support/register';

import { describe } from '@dxos/test';

import { StorageType } from '../common';
import { storageBenchmark } from '../testing/benchmark.blueprint-test';
import { createStorage } from './storage';

const ROOT_DIRECTORY = 'testing';

describe.skip('bench', () => {
  for (const storageType of [StorageType.RAM, StorageType.IDB] as StorageType[]) {
    storageBenchmark(storageType, () => createStorage({ type: storageType, root: ROOT_DIRECTORY }));
  }
});
