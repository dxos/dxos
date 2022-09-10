//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';
import del from 'del';
import expect from 'expect';
import { promises as fs, constants } from 'fs';
import path from 'path';

import { File, StorageType } from './api';
import { createStorage } from './node';
import { storageTests } from './storage.blueprint-test';

const ROOT_DIRECTORY = path.resolve(path.join(__dirname, '..', 'out', 'index.test'));

const temp = () => path.join(ROOT_DIRECTORY, crypto.randomBytes(32).toString('hex'));

const write = async (file: File) => {
  const buffer = Buffer.from('test');
  await file.write(10, buffer);
  await expect(file.read(10, 4)).resolves.toEqual(buffer);
};

after(() => del(ROOT_DIRECTORY));

describe('testing node storage types', () => {
  it('create storage with node file by default', async () => {
    const directory = temp();
    const storage = createStorage(directory);
    expect(storage.type).toBe(StorageType.NODE);
  });

  it('create file', async () => {
    const directory = temp();
    const storage = createStorage(directory);
    const storageDir = storage.directory('dir');

    const file = storageDir.createOrOpen('file');
    await write(file);
    await expect(fs.access(path.join(directory, 'dir', 'file'), constants.F_OK)).resolves.toBeUndefined();
  });

  it('delete directory', async () => {
    const directory = temp();
    const storage = createStorage(directory);
    const storageDir = storage.directory('dir');

    const file = storageDir.createOrOpen('file');
    await write(file);

    // Check dir destroy.
    await storageDir.delete();
    await expect(fs.access(path.join(directory, 'dir', 'file'), constants.F_OK)).rejects.toThrow(/ENOENT/);
  });

  it('destroy storage', async () => {
    const directory = temp();
    const storage = createStorage(directory);
    const storageDir = storage.directory('dir');

    const file = storageDir.createOrOpen('file');
    await write(file);

    // Check storage destroy.
    await storage.destroy();
    await expect(fs.access(directory, constants.F_OK)).rejects.toThrow(/ENOENT/);
  });

  it('should throw an assert error if invalid type for platform', () => {
    expect(() => createStorage('error', StorageType.IDB)).toThrow(/Unsupported storage/);
  });

  it('file exists and destroyes in subDirectory', async () => {
    const directory = temp();
    const storage = createStorage(directory);
    const storageDir = storage.directory('dir');
    const storageSubDirectory = storageDir.createDirectory('sub');
    const file = storageSubDirectory.createOrOpen('file');
    await write(file);
    await expect(fs.access(path.join(directory, 'dir', 'sub', 'file'), constants.F_OK)).resolves.toBeUndefined();

    await storage.destroy();
    await expect(fs.access(directory, constants.F_OK)).rejects.toThrow(/ENOENT/);
  });

  storageTests(StorageType.RAM, () => createStorage(ROOT_DIRECTORY, StorageType.RAM));
  storageTests(StorageType.NODE, () => createStorage(ROOT_DIRECTORY, StorageType.NODE));
});
