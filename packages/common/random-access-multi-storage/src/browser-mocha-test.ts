//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import 'source-map-support/register';
import pify from 'pify';

import { createStorage } from './browser';
import { STORAGE_IDB, STORAGE_RAM } from './storage-types';

const ROOT_DIRECTORY = 'testing';

describe('Tests for different storage types in different browsers', () => {
  const write = async (storage: any) => {
    const file = storage('file1');
    const buffer = Buffer.from('test');
    await pify(file.write.bind(file))(10, buffer);
    const bufferRead = await pify(file.read.bind(file))(10, 4);
    const result = buffer.equals(bufferRead);
    expect(result).toBeTruthy();
  }

  for(const storageType of [STORAGE_RAM, STORAGE_IDB]) {
    it(`${storageType}`, async function () {
      if (browserMocha.context.browser === 'webkit' && storageType === STORAGE_IDB) {
        this.skip();
      }

      const storage = createStorage(ROOT_DIRECTORY, STORAGE_IDB);

      await write(storage);
      expect(storage._storage._files.size).toEqual(1);
      
      await storage.destroy();
      expect(storage._storage._files.size).toEqual(0);
    })
  }

  it.skip(`Used ${STORAGE_IDB} by default`, async function () {
    const storage = createStorage(ROOT_DIRECTORY);
    expect(storage.type).toBe(STORAGE_IDB);
  })
})