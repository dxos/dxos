//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import 'source-map-support/register';

import { StorageType } from './api';
import { createStorage } from './browser';
import { storageTests } from './storage.blueprint-test';

const ROOT_DIRECTORY = 'testing';

describe('Tests for different storage types in different browsers', () => {
  for (const storageType of [StorageType.RAM, StorageType.IDB] as StorageType[]) {
    storageTests(storageType, () => createStorage({ type: storageType, root: ROOT_DIRECTORY }));
  }

  it(`Used ${StorageType.IDB} by default`, async () => {
    const storage = createStorage({ root: ROOT_DIRECTORY });
    expect(storage.type).toBe(StorageType.IDB);
  });
});
