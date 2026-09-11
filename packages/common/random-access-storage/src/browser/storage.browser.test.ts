//
// Copyright 2021 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { StorageType } from '../common/index.ts';
import { storageTests } from '../testing/index.ts';
import { createStorage } from './storage.ts';

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
