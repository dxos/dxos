//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import 'source-map-support/register';

import { createStorage } from './browser';
import { StorageType } from './interfaces/storage-types';
import { storageTests } from './storage.blueprint-test';

const ROOT_DIRECTORY = 'testing';

describe('Tests for different storage types in different browsers', () => {
  for (const storageType of [StorageType.ram, StorageType.idb] as StorageType[]) {
    storageTests(storageType, () => createStorage(ROOT_DIRECTORY, storageType));
  }

  it(`Used ${StorageType.idb} by default`, async function () {
    const storage = createStorage(ROOT_DIRECTORY);
    expect(storage.type).toBe(StorageType.idb);
  });
});
