//
// Copyright 2021 DXOS.org
//

// @dxos/test platform=browser

import expect from 'expect';
import 'source-map-support/register';

import { describe, test } from '@dxos/test';

import { createStorage } from './storage';
import { StorageType } from '../common';
import { storageTests } from '../testing';

const ROOT_DIRECTORY = 'testing';

describe('Tests for different storage types in different browsers', () => {
  for (const storageType of [StorageType.RAM, StorageType.IDB, StorageType.WEBFS] as StorageType[]) {
    if (mochaExecutor.environment === 'webkit' && storageType === StorageType.WEBFS) {
      // Skip WEBFS in webkit.
      continue;
    }
    storageTests(storageType, () => createStorage({ type: storageType, root: ROOT_DIRECTORY }));
  }

  test.skip(`Used ${StorageType.WEBFS} by default`, async () => {
    const storage = createStorage({ root: ROOT_DIRECTORY });
    expect(storage.type).toBe(StorageType.WEBFS);
  });
});
