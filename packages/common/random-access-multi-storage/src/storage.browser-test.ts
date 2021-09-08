//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import 'source-map-support/register';

import { createStorage } from './browser';
import { StorageType, STORAGE_IDB, STORAGE_RAM } from './interfaces/storage-types';
import { storageTests } from './storage.blueprint-test';

const ROOT_DIRECTORY = 'testing';

describe('Tests for different storage types in different browsers', () => {
  for (const storageType of [STORAGE_RAM, STORAGE_IDB] as StorageType[]) {
    storageTests(storageType, () => createStorage(ROOT_DIRECTORY, storageType));
  }

  it(`Used ${STORAGE_IDB} by default`, async function () {
    const storage = createStorage(ROOT_DIRECTORY);
    expect(storage.type).toBe(STORAGE_IDB);
  });
});
