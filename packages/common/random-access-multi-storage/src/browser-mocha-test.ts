//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import 'source-map-support/register';
import { STORAGE_RAM } from './storage-types';
import pify from 'pify';
import { createStorage } from './browser';

const ROOT_DIRECTORY = 'testing';

describe('testing browser storages', () => {
  const storage = createStorage(ROOT_DIRECTORY, STORAGE_RAM)

  const testWrite = async () => {
    const file = storage('file1');
    const buffer = Buffer.from('test');
    await pify(file.write.bind(file))(10, buffer);
    const bufferRead = await pify(file.read.bind(file))(10, 4);
    const result = buffer.equals(bufferRead)
    expect(result).toBeTruthy();
  }

  const testDestroy = async () => {
    await storage.destroy();
  };

  beforeEach(async () => {
  });

  it('ram storage', async () => {
    expect(storage.root).toBe(ROOT_DIRECTORY);
    expect(storage.type).toBe(STORAGE_RAM);

    await testWrite();
    expect(storage._storage._files.size).toEqual(1);

    await testDestroy();
    expect(storage._storage._files.size).toEqual(0);
  });
});
