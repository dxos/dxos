//
// Copyright 2021 DXOS.org
//

// @dxos/mocha platform=browser

import expect from 'expect';
import 'source-map-support/register';

import { StorageType } from '../common';
import { storageTests } from '../testing';
import { createStorage } from './storage';

const ROOT_DIRECTORY = 'testing';

describe('Tests for different storage types in different browsers', function () {
  for (const storageType of [
    StorageType.RAM,
    StorageType.IDB
  ] as StorageType[]) {
    storageTests(storageType, () =>
      createStorage({ type: storageType, root: ROOT_DIRECTORY })
    );
  }

  it(`Used ${StorageType.IDB} by default`, async function () {
    const storage = createStorage({ root: ROOT_DIRECTORY });
    expect(storage.type).toBe(StorageType.IDB);
  });
});
