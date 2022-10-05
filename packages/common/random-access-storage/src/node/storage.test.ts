//
// Copyright 2021 DXOS.org
//

// @dxos/mocha nodejs

import crypto from 'crypto';
import del from 'del';
import expect from 'expect';
import { promises as fs, constants } from 'fs';
import path from 'path';

import { File, StorageType } from '../common';
import { storageTests } from '../testing';
import { createStorage } from './storage';

const ROOT_DIRECTORY = path.resolve(path.join(__dirname, '../out', 'testing'));

const temp = () => path.join(ROOT_DIRECTORY, crypto.randomBytes(32).toString('hex'));

const write = async (file: File, data = 'test') => {
  const buffer = Buffer.from(data);
  const offset = 8;
  await file.write(offset, buffer);
  await expect(file.read(offset, buffer.length)).resolves.toEqual(buffer);
};

describe('testing node storage types', function () {
  before(function () {
    return del(ROOT_DIRECTORY);
  });
  after(function () {
    return del(ROOT_DIRECTORY);
  });

  it('create storage with node file by default', async function () {
    const dir = temp();
    const storage = createStorage({ root: dir });
    expect(storage.type).toBe(StorageType.NODE);
  });

  it('create file', async function () {
    const dir = temp();
    const storage = createStorage({ root: dir });
    const storageDir = storage.createDirectory('dir');

    const file = storageDir.createOrOpenFile('file');
    await write(file);
    // TODO(burdon): Why test undefined?
    await expect(fs.access(path.join(dir, 'dir', 'file'), constants.F_OK)).resolves.toBeUndefined();
  });

  it('delete directory', async function () {
    const dir = temp();
    const storage = createStorage({ root: dir });
    const storageDir = storage.createDirectory('dir');

    const file = storageDir.createOrOpenFile('file');
    await write(file);

    // Check dir destroy.
    await storageDir.delete();
    await expect(fs.access(path.join(dir, 'dir', 'file'), constants.F_OK)).rejects.toThrow(/ENOENT/);
  });

  it('destroy storage', async function () {
    const dir = temp();
    const storage = createStorage({ root: dir });
    const storageDir = storage.createDirectory('dir');

    const file = storageDir.createOrOpenFile('file');
    await write(file);

    // Check storage destroy.
    await storage.destroy();
    await expect(fs.access(dir, constants.F_OK)).rejects.toThrow(/ENOENT/);
  });

  it('should throw an assert error if invalid type for platform', function () {
    expect(() => createStorage({ type: StorageType.IDB, root: 'error' })).toThrow(/Invalid/);
  });

  it('file exists and destroyes in subDirectory', async function () {
    const dir = temp();
    const storage = createStorage({ root: dir });
    const storageDir = storage.createDirectory('dir');
    const storageSubDirectory = storageDir.createDirectory('sub');
    const file = storageSubDirectory.createOrOpenFile('file');
    await write(file);
    await expect(fs.access(path.join(dir, 'dir', 'sub', 'file'), constants.F_OK)).resolves.toBeUndefined();

    await storage.destroy();
    await expect(fs.access(dir, constants.F_OK)).rejects.toThrow(/ENOENT/);
  });

  storageTests(StorageType.RAM, () => createStorage({ type: StorageType.RAM, root: ROOT_DIRECTORY }));
  storageTests(StorageType.NODE, () => createStorage({ type: StorageType.NODE, root: ROOT_DIRECTORY }));
});
