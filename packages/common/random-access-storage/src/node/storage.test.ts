//
// Copyright 2021 DXOS.org
//

// @dxos/test platform=nodejs

import crypto from 'crypto';
import del from 'del';
import expect from 'expect';
import { promises as fs, constants } from 'fs';
import path from 'path';

import { afterAll, beforeAll, describe, test } from '@dxos/test';

import { File, StorageType } from '../common';
import { randomText, storageTests } from '../testing';
import { createStorage } from './storage';

const ROOT_DIRECTORY = path.resolve(path.join(__dirname, '../out', 'testing'));

const temp = () => path.join(ROOT_DIRECTORY, crypto.randomBytes(32).toString('hex'));

const write = async (file: File, data = 'test') => {
  const buffer = Buffer.from(data);
  const offset = 8;
  await file.write(offset, buffer);
  await expect(file.read(offset, buffer.length)).resolves.toEqual(buffer);
};

// TODO(burdon): storage.test.ts here and in browser should have the same format.

/**
 * Node file system specific tests.
 */
describe('testing node storage types', () => {
  beforeAll(() => del(ROOT_DIRECTORY));

  afterAll(() => del(ROOT_DIRECTORY));

  for (const storageType of [StorageType.RAM, StorageType.NODE] as StorageType[]) {
    storageTests(storageType, () => createStorage({ type: storageType, root: ROOT_DIRECTORY }));
  }

  test('create storage with node file by default', async () => {
    const dir = temp();
    const storage = createStorage({ root: dir });
    expect(storage.type).toBe(StorageType.NODE);
  });

  test('create file', async () => {
    const dir = temp();
    const storage = createStorage({ root: dir });
    const storageDir = storage.createDirectory('dir');

    const file = storageDir.getOrCreateFile('file');
    await write(file);
    // TODO(burdon): Why test undefined?
    await expect(fs.access(path.join(dir, 'dir', 'file'), constants.F_OK)).resolves.toBeUndefined();
  });

  test('delete directory', async () => {
    const dir = temp();
    const storage = createStorage({ root: dir });
    const storageDir = storage.createDirectory('dir');

    const file = storageDir.getOrCreateFile('file');
    await write(file);

    // Check dir destroy.
    await storageDir.delete();
    await expect(fs.access(path.join(dir, 'dir', 'file'), constants.F_OK)).rejects.toThrow(/ENOENT/);
  });

  test('destroy storage', async () => {
    const dir = temp();
    const storage = createStorage({ root: dir });
    const storageDir = storage.createDirectory('dir');

    const file = storageDir.getOrCreateFile('file');
    await write(file);

    // Check storage destroy.
    await storage.reset();
    await expect(fs.access(dir, constants.F_OK)).rejects.toThrow(/ENOENT/);
  });

  test('should throw an assert error if invalid type for platform', () => {
    expect(() => createStorage({ type: StorageType.IDB, root: 'error' })).toThrow(/Invalid/);
  });

  test('file exists and destroys in subDirectory', async () => {
    const dir = temp();
    const storage = createStorage({ root: dir });
    const storageDir = storage.createDirectory('dir');
    const storageSubDirectory = storageDir.createDirectory('sub');
    const file = storageSubDirectory.getOrCreateFile('file');
    await write(file);
    await expect(fs.access(path.join(dir, 'dir', 'sub', 'file'), constants.F_OK)).resolves.toBeUndefined();

    await storage.reset();
    await expect(fs.access(dir, constants.F_OK)).rejects.toThrow(/ENOENT/);
  });

  // TODO(burdon): Factor out into suites of blueprints.
  test('persistence', async () => {
    const filename = randomText();
    const data = Buffer.from(randomText());

    {
      const storage = createStorage({ root: ROOT_DIRECTORY });
      const dir = storage.createDirectory('dir');
      const file = dir.getOrCreateFile(filename);
      await file.write(0, data);
      await file.close();
    }

    {
      const storage = createStorage({ root: ROOT_DIRECTORY });
      const dir = storage.createDirectory('dir');
      const file = dir.getOrCreateFile(filename);
      const dataRead = await file.read(0, data.length);
      expect(data.equals(dataRead)).toBeTruthy();
    }
  });
});
