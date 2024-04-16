//
// Copyright 2021 DXOS.org
//

import { expect, describe, test } from 'vitest';

import { createStorage } from './storage';
import { StorageType } from '../common';
import { storageTests } from '../testing';

const ROOT_DIRECTORY = 'testing';

describe('Tests for different storage types in different browsers', () => {
  for (const dataStore of [StorageType.RAM, StorageType.IDB, StorageType.WEBFS] as StorageType[]) {
    storageTests(dataStore, (name: string) => createStorage({ type: dataStore, root: `${ROOT_DIRECTORY}-${name}` }));
  }

  test.skip(`Used ${StorageType.WEBFS} by default`, async () => {
    const storage = createStorage({ root: ROOT_DIRECTORY });
    expect(storage.type).toBe(StorageType.WEBFS);
  });
});
