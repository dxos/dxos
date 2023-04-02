//
// Copyright 2021 DXOS.org
//

// @dxos/test platform=nodejs

import crypto from 'crypto';
import del from 'del';
import expect from 'expect';
import path from 'path';

import { afterAll, beforeAll, describe } from '@dxos/test';

import { File, StorageType } from '../common';
import { storageBenchmark } from '../testing/benchmark.blueprint-test';
import { createStorage } from './storage';

const ROOT_DIRECTORY = path.resolve(path.join(__dirname, '../out', 'testing'));

/**
 * Node file system specific tests.
 */
describe.only('storage benchmark', () => {
  beforeAll(() => del(ROOT_DIRECTORY));

  afterAll(() => del(ROOT_DIRECTORY));

  for (const storageType of [StorageType.RAM, StorageType.NODE] as StorageType[]) {
    storageBenchmark(storageType, () => createStorage({ type: storageType, root: ROOT_DIRECTORY }));
  }
});
