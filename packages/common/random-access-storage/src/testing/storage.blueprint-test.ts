//
// Copyright 2021 DXOS.org
//

import * as uuid from 'uuid';
import { describe, expect, test } from 'vitest';

import { asyncTimeout } from '@dxos/async';

import { type File, type Storage, StorageType } from '../common';

export const randomText = () => uuid.v4();

export const storageTests = (testGroupName: StorageType, createStorage: (name: string) => Storage) => {
  const writeAndCheck = async (file: File, data: Buffer, offset = 0) => {
    await file.write(offset, data);
    const bufferRead = await file.read(offset, data.length);
    const result = data.equals(bufferRead);
    expect(result).toBeTruthy();
  };

  describe(testGroupName, () => {
    test('open & close', async () => {
      const storageName = uuid.v4();

      const storage = createStorage(storageName);
      const directory = storage.createDirectory();
      const fileName = randomText();
      const file = directory.getOrCreateFile(fileName);
      await file.close();
    });

    test('open file, read & write', async () => {
      const storageName = uuid.v4();

      const storage = createStorage(storageName);
      const fileName = randomText();
      const directory = storage.createDirectory();
      const file = directory.getOrCreateFile(fileName);

      // eslint-disable-next-line unused-imports/no-unused-vars
      for (const _ of Array.from(Array(5))) {
        const offset = Math.round(Math.random() * 1000);
        const buffer = Buffer.from(randomText());
        await writeAndCheck(file, buffer, offset);
      }

      await file.close();
    });

    test('list files', async () => {
      const storageName = uuid.v4();

      const storage = createStorage(storageName);
      const directoryName = randomText();
      const directory = storage.createDirectory(directoryName);

      const count = 10;
      const files = [...Array(count)].map(() => directory.getOrCreateFile(randomText()));

      {
        // Create and check files amount.
        for (const file of files) {
          const buffer = Buffer.from(randomText());
          await writeAndCheck(file, buffer);
        }

        const entries = await directory.list();
        expect(entries.length).toEqual(count);
      }

      {
        // Check files amount after partial deletion.
        const amountToDelete = 5;
        const filesToDelete = files.slice(0, amountToDelete);
        for (const file of filesToDelete) {
          await file.destroy();
        }

        const entries = await directory.list();
        expect(entries.length).toEqual(count - amountToDelete);
      }

      // Cleanup.
      for (const file of files) {
        await file.close();
      }
    });

    test('read from empty file', async () => {
      const storageName = uuid.v4();

      const storage = createStorage(storageName);
      const directory = storage.createDirectory();

      const fileName = randomText();
      const file = directory.getOrCreateFile(fileName);
      const { size } = await file.stat();
      const data = await file.read(0, size);
      expect(Buffer.from('')).toEqual(data);
    });

    test('reopen and check if data is the same', async () => {
      const storageName = uuid.v4();

      const storage = createStorage(storageName);
      const directory = storage.createDirectory();
      const fileName = randomText();
      const data1 = Buffer.from(randomText());

      {
        const file = directory.getOrCreateFile(fileName);
        await writeAndCheck(file, data1);
        await file.close();
      }

      {
        const file = directory.getOrCreateFile(fileName);
        const data2 = await file.read(0, data1.length);
        expect(data1).toEqual(data2);
        await file.close();
      }
    });

    test('destroy clears all data', async () => {
      const storageName = uuid.v4();

      const storage = createStorage(storageName);
      const directory = storage.createDirectory();
      const fileName = randomText();

      {
        const file = directory.getOrCreateFile(fileName);
        const buffer = Buffer.from(randomText());
        await writeAndCheck(file, buffer);
        await file.close();
        await file.destroy();
      }

      {
        const file = directory.getOrCreateFile(fileName);
        const { size } = await file.stat();
        expect(size).toBe(0);
        await file.close();
      }
    });

    test('double destroy file', async (t) => {
      if (testGroupName !== StorageType.NODE) {
        t.skip();
      }
      const storageName = uuid.v4();

      const fileName = randomText();
      let firstHandle: File;
      let secondHandle: File;

      {
        const storage = createStorage(storageName);
        const directory = storage.createDirectory();
        const file = directory.getOrCreateFile(fileName);
        const buffer = Buffer.from(randomText());
        await writeAndCheck(file, buffer);
        firstHandle = file;
      }

      {
        const storage = createStorage(storageName);
        const directory = storage.createDirectory();
        const file = directory.getOrCreateFile(fileName);
        const buffer = Buffer.from(randomText());
        await writeAndCheck(file, buffer);
        secondHandle = file;
      }

      await firstHandle.destroy();
      await expect(secondHandle.destroy()).rejects.toThrow();
    });

    test('sub-directories', async () => {
      const storageName = uuid.v4();

      // 1. Create storage and two subdirectories
      const storage = createStorage(storageName);
      const dir1 = storage.createDirectory('dir1');
      const dir2 = storage.createDirectory('dir2');

      const fileName = randomText();
      const buffer1 = Buffer.from(randomText());
      const buffer2 = Buffer.from(randomText());

      // 2. Create a file in first subdirectory and write content
      const file1 = dir1.getOrCreateFile(fileName);
      await file1.write(0, buffer1);

      // 3. Create a file with the same name in the second subdir and write different content
      const file2 = dir2.getOrCreateFile(fileName);
      await file2.write(0, buffer2);

      // 4. Check that they have correct content.
      expect(await file1.read(0, buffer1.length)).toEqual(buffer1);
      expect(await file2.read(0, buffer2.length)).toEqual(buffer2);
    });

    test('write in directory/sub-directory/file', async () => {
      const storageName = uuid.v4();

      const storage = createStorage(storageName);
      const dir = storage.createDirectory('directory');
      const subDir = dir.createDirectory('subDirectory');

      const file = subDir.getOrCreateFile(randomText());
      const buffer = Buffer.from(randomText());
      await file.write(0, buffer);

      const readBuffer = await file.read(0, buffer.length);
      expect(readBuffer).toEqual(buffer);
      await file.close();
    });

    test('all writes are flushed', async (t) => {
      if (testGroupName === StorageType.RAM) {
        t.skip();
      }
      const storageName = uuid.v4();

      const fileName = randomText();
      {
        const storage = createStorage(storageName);
        const directory = storage.createDirectory();
        const file = directory.getOrCreateFile(fileName);
        await file.write(0, Buffer.alloc(10, '0'));
        for (let i = 1; i <= 9; i++) {
          void file.write(i, Buffer.from(String(i)));
        }
        await file.close();
      }

      {
        const storage = createStorage(storageName);
        const directory = storage.createDirectory();
        const file = directory.getOrCreateFile(fileName);
        const allContent = await file.read(0, (await file.stat()).size);
        expect(allContent.toString()).toBe('0123456789');
      }
    });

    test('flush interleaved with write', async (t) => {
      if (testGroupName === StorageType.RAM) {
        t.skip();
      }
      const storageName = uuid.v4();

      const fileName = randomText();
      {
        const storage = createStorage(storageName);
        const directory = storage.createDirectory();
        const file = directory.getOrCreateFile(fileName);
        await file.write(0, Buffer.alloc(3, '0'));
        await file.write(1, Buffer.from('1'));
        void file.flush?.();
        await file.write(2, Buffer.from('2'));
        await file.close();
      }

      {
        const storage = createStorage(storageName);
        const directory = storage.createDirectory();
        const file = directory.getOrCreateFile(fileName);
        const allContent = await file.read(0, (await file.stat()).size);
        expect(allContent.toString()).toBe('012');
      }
    });

    test('operations on a destroyed file are rejected', async () => {
      const storageName = uuid.v4();

      const storage = createStorage(storageName);
      const directory = storage.createDirectory();
      const file = directory.getOrCreateFile(randomText());

      const buffer = Buffer.from(randomText());
      await writeAndCheck(file, buffer);
      await file.destroy();

      expect(file.destroyed).toBeTruthy();
      await expect(file.destroy()).resolves.toBeUndefined();
      await expect(file.read(0, 1)).rejects.toThrow();
      await expect(file.write(0, buffer)).rejects.toThrow();
      await expect(file.del(0, 1)).rejects.toThrow();
      await expect(file.stat()).rejects.toThrow();
      if (file.truncate) {
        await expect(file.truncate(0)).rejects.toThrow();
      }
    });

    test('delete directory', async () => {
      const storageName = uuid.v4();

      const storage = createStorage(storageName);
      const directory = storage.createDirectory();
      const file = directory.getOrCreateFile(randomText());

      const buffer = Buffer.from(randomText());
      await writeAndCheck(file, buffer);

      await directory.delete();
      await expect(file.read(0, buffer.length)).rejects.toThrow();
    });

    test('del method', async (t) => {
      // File.del() throws 'Not deletable' error for IDb.
      if (testGroupName !== StorageType.NODE) {
        t.skip();
      }
      const storageName = uuid.v4();

      const storage = createStorage(storageName);

      const directory = storage.createDirectory();
      const file = directory.getOrCreateFile(randomText());

      const buffer1 = Buffer.from(randomText());
      await file.write(0, buffer1);
      const buffer2 = Buffer.from(randomText());
      await file.write(buffer1.length, buffer2);
      expect((await file.stat()).size).to.equal(buffer1.length + buffer2.length);

      // Weird behavior. Works only if offset + size === file size. If greater - throws error, if less - does nothing.
      await file.del(buffer1.length, buffer2.length);
      expect((await file.stat()).size).to.equal(buffer1.length);
      expect(await file.read(0, buffer1.length)).to.deep.equal(buffer1);
      await expect(file.read(buffer1.length, buffer2.length)).rejects.toThrow('Could not satisfy length');
    });

    test('stat of new file', async () => {
      const storageName = uuid.v4();

      const storage = createStorage(storageName);
      const directory = storage.createDirectory();
      const file = directory.getOrCreateFile(randomText());
      expect((await file.stat()).size).toBe(0);
    });

    test('call del with edge arguments', async () => {
      const storageName = uuid.v4();

      const storage = createStorage(storageName);
      if (storage.type === StorageType.IDB) {
        // Not deletable.
        return;
      }
      const directory = storage.createDirectory();

      const buffer = Buffer.from(randomText());
      {
        const file = directory.getOrCreateFile(randomText());
        await file.write(0, buffer);
        await file.del(0, buffer.length + 1);
        expect((await file.stat()).size).toBe(0);
      }

      {
        const file = directory.getOrCreateFile(randomText());
        await file.write(0, buffer);
        await file.del(1, buffer.length);
        expect((await file.stat()).size).toBe(1);
      }

      {
        const file = directory.getOrCreateFile(randomText());
        await file.write(0, buffer);
        await file.del(0, -1);
        expect((await file.stat()).size).toBe(buffer.length);
      }
    });

    test('reset', async (t) => {
      if (
        testGroupName === StorageType.RAM || // RAM storage does not persist data.
        testGroupName === StorageType.IDB // IDB storage is blocked by opened connection, and there is no handle to close it.
      ) {
        t.skip();
      }
      const storageName = uuid.v4();
      const filename = randomText();
      const buffer = Buffer.from(randomText());

      {
        const storage = createStorage(storageName);
        const directory = storage.createDirectory();
        const file = directory.getOrCreateFile(filename);
        await file.write(0, buffer);
        await file.close();
      }

      {
        const storage = createStorage(storageName);
        const directory = storage.createDirectory();
        const file = directory.getOrCreateFile(filename);
        await expect(file.read(0, buffer.length)).resolves.toEqual(buffer);
        await file.close();
      }

      {
        const storage = createStorage(storageName);
        await asyncTimeout(storage.reset(), 1_000);
      }

      {
        const storage = createStorage(storageName);
        const directory = storage.createDirectory();
        const file = directory.getOrCreateFile(filename);
        const { size } = await file.stat();
        await expect(size).to.eq(0);
      }
    });

    test('list all files after reopen', async (t) => {
      if (testGroupName === StorageType.RAM) {
        t.skip();
      }
      const storageName = uuid.v4();
      const dirname = randomText();

      const storage = createStorage(storageName);
      const directory = storage.createDirectory(dirname);

      {
        const entries = await directory.list();
        expect(entries.length).toBe(0);
      }

      const files = [...Array(10)].map(() => directory.getOrCreateFile(randomText()));
      for (const file of files) {
        const buffer = Buffer.from(randomText());
        await writeAndCheck(file, buffer);
      }

      {
        const entries = await directory.list();
        expect(entries.length).toBe(files.length);
      }

      {
        const storage = createStorage(storageName);
        const directory = storage.createDirectory(dirname);
        const entries = await directory.list();
        expect(entries.length).toBe(files.length);
      }
    });

    test('list returns correct filenames', async () => {
      const storageName = uuid.v4();
      const FILES = ['one', 'two', 'three'];

      // Create storage and check.
      const storage = createStorage(storageName);
      const directory = storage.createDirectory('dir');

      for (const file of FILES) {
        directory.getOrCreateFile(file);
      }
      await directory.flush();
      const entries = await directory.list();
      expect(entries).toEqual(expect.arrayContaining(FILES));
    });

    test('getDiskInfo returns correct size', async (t) => {
      const storageName = uuid.v4();

      const storage = createStorage(storageName);
      if (storage.type === StorageType.IDB) {
        t.skip();
      }
      await storage.reset();
      const directory = storage.createDirectory('dir');
      const file = directory.getOrCreateFile(randomText());
      const content = 'Hello, world!';
      await file.write(0, Buffer.from(content));
      await file.close();
      await expect(storage.getDiskInfo?.() ?? Promise.resolve(-1)).resolves.toEqual({
        used: content.length,
      });
    });
  });
};
