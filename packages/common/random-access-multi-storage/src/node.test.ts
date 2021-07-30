//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';
import del from 'del';
import expect from 'expect';
import { promises as fs, constants } from 'fs';
import path from 'path';
import pify from 'pify';

import { createStorage } from './node';
import { STORAGE_RAM, STORAGE_NODE, STORAGE_IDB } from './implementations/storage-types';
import { IFile } from './interfaces/IFile';

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

  it('create a storage with ram type', async () => {
    const storage = createStorage('testing', STORAGE_RAM);
    expect(storage.type).toBe(STORAGE_RAM);

    const file = storage.createOrOpen('file1');
    await write(file);

    // Check destroy
    await storage.destroy();
  });

  it('should throw an assert error if invalid type for platform', () => {
    expect(() => createStorage('error', STORAGE_IDB)).toThrow(/Unsupported storage/);
  });
});
