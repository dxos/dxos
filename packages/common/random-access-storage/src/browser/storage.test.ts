//
// Copyright 2021 DXOS.org
//

// @dxos/test platform=browser

import expect from 'expect';
import 'source-map-support/register';

import { describe, test } from '@dxos/test';

import { StorageType } from '../common';
import { storageTests } from '../testing';
import { createStorage } from './storage';

const ROOT_DIRECTORY = 'testing';

describe('Tests for different storage types in different browsers', () => {
  for (const storageType of [StorageType.RAM, StorageType.IDB] as StorageType[]) {
    storageTests(storageType, () => createStorage({ type: storageType, root: ROOT_DIRECTORY }));
  }

  test(`Used ${StorageType.IDB} by default`, async () => {
    const storage = createStorage({ root: ROOT_DIRECTORY });
    expect(storage.type).toBe(StorageType.IDB);
  });
});
