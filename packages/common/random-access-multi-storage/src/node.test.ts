//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';
import del from 'del';
import expect from 'expect';
import { promises as fs, constants } from 'fs';
import path from 'path';
import pify from 'pify';

import { IFile } from './interfaces/IFile';
import { STORAGE_RAM, STORAGE_NODE, STORAGE_IDB } from './interfaces/storage-types';
import { createStorage } from './node';
import { storageTests } from './storage.blueprint-test';

const ROOT_DIRECTORY = path.resolve(path.join(__dirname, '..', 'out', 'index.test'));

const temp = () => path.join(ROOT_DIRECTORY, crypto.randomBytes(32).toString('hex'));

const write = async (file: IFile) => {
  const buffer = Buffer.from('test');
  await pify(file.write.bind(file))(10, buffer);
  await expect(pify(file.read.bind(file))(10, 4)).resolves.toEqual(buffer);
};

after(() => del(ROOT_DIRECTORY));

describe('testing node storage types', () => {
  it('create storage with node file by default', async () => {
    const directory = temp();
    const storage = createStorage(directory);
    expect(storage.type).toBe(STORAGE_NODE);

    // Check write a file
    const file = storage.createOrOpen('file1');
    await write(file);
    await expect(fs.access(path.join(directory, 'file1'), constants.F_OK)).resolves.toBeUndefined();

    // Check destroy
    await storage.destroy();
    await expect(fs.access(directory, constants.F_OK)).rejects.toThrow(/ENOENT/);
  });

  it('should throw an assert error if invalid type for platform', () => {
    expect(() => createStorage('error', STORAGE_IDB)).toThrow(/Unsupported storage/);
  });

  storageTests(STORAGE_RAM, () => createStorage(ROOT_DIRECTORY, STORAGE_RAM));
  storageTests(STORAGE_NODE, () => createStorage(ROOT_DIRECTORY, STORAGE_NODE));
});
