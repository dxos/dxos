//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import assert from 'node:assert';

import { File, Storage, StorageType } from '../common';

export const randomText = () => Math.random().toString(36).substring(2);

export function storageTests(testGroupName: StorageType, createStorage: () => Storage) {
  const writeAndCheck = async (file: File, data: Buffer, offset = 0) => {
    await file.write(offset, data);
    const bufferRead = await file.read(offset, data.length);
    const result = data.equals(bufferRead);
    expect(result).toBeTruthy();
  };

  describe(testGroupName, () => {
    it('open & close', async () => {
      const storage = createStorage();
      const directory = storage.createDirectory();
      const fileName = randomText();
      const file = directory.getOrCreateFile(fileName);
      await file.close();
    });

    it('open file, read & write', async () => {
      const storage = createStorage();
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

    it('create files', async () => {
      const storage = createStorage();
      const directory = storage.createDirectory();

      const count = 10;
      const files = [...Array(count)].map(() => directory.getOrCreateFile(randomText()));

      for (const file of files) {
        const buffer = Buffer.from(randomText());
        await writeAndCheck(file, buffer);
      }

      const list = directory.getFiles();
      expect(list).toHaveLength(count);

      for (const file of files) {
        await file.close();
      }
    });

    it('read from empty file', async () => {
      const storage = createStorage();
      const directory = storage.createDirectory();

      const fileName = randomText();
      const file = directory.getOrCreateFile(fileName);
      const { size } = await file.stat();
      const data = await file.read(0, size);
      expect(Buffer.from('').equals(data)).toBeTruthy();
    });

    it('reopen and check if data is the same', async () => {
      const storage = createStorage();
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
        expect(data1.equals(data2)).toBeTruthy();
        await file.close();
      }
    });

    it('destroy clears all data', async () => {
      if (new Set([StorageType.IDB, StorageType.CHROME, StorageType.FIREFOX]).has(testGroupName)) {
        return;
      }
      const storage = createStorage();
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

    it('sub-directories', async () => {
      // 1. Create storage and two subdirectories
      const storage = createStorage();
      const dir1 = storage.createDirectory('dir1');
      const dir2 = storage.createDirectory('dir2');

      const fileName = 'file';
      const buffer1 = Buffer.from(randomText());
      const buffer2 = Buffer.from(randomText());

      // 2. Create a file in first subdirectory and write content
      const file1 = dir1.getOrCreateFile(fileName);
      await file1.write(0, buffer1);

      // 3. Create a file with the same name in the second subdir and write different content
      const file2 = dir2.getOrCreateFile(fileName);
      await file2.write(0, buffer2);

      // 4. Check that they have correct content.
      expect(await file1.read(0, buffer1.length)).toStrictEqual(buffer1);
      expect(await file2.read(0, buffer2.length)).toStrictEqual(buffer2);
    });

    it('write in directory/sub-directory/file', async () => {
      const storage = createStorage();
      const dir = storage.createDirectory('directory');
      const subDir = dir.createDirectory('subDirectory');

      const file = subDir.getOrCreateFile('file');
      const buffer = Buffer.from(randomText());
      await file.write(0, buffer);

      const readBuffer = await file.read(0, buffer.length);
      expect(readBuffer).toStrictEqual(buffer);
      await file.close();
    });

    it('delete directory', async () => {
      const storage = createStorage();
      const directory = storage.createDirectory();
      const file = directory.getOrCreateFile('file');

      const buffer = Buffer.from(randomText());
      await writeAndCheck(file, buffer);

      await directory.delete();
      await assert.rejects(async () => await file.read(0, buffer.length), Error, 'Closed');
    });

    it('del method', async function () {
      const storage = createStorage();

      // File.del() throws 'Not deletable' error for IDb.
      if (storage.type === StorageType.IDB) {
        this.skip();
      }

      const directory = storage.createDirectory();
      const file = directory.getOrCreateFile(randomText());

      const buffer1 = Buffer.from(randomText());
      await file.write(0, buffer1);
      const buffer2 = Buffer.from(randomText());
      await file.write(buffer1.length, buffer2);
      expect((await file.stat()).size).toBe(buffer1.length + buffer2.length);

      await file.del(buffer1.length, buffer2.length);
      expect((await file.stat()).size).toBe(buffer1.length);
      expect(await file.read(0, buffer1.length)).toStrictEqual(buffer1);
      await assert.rejects(
        async () => await file.read(buffer1.length, buffer2.length),
        Error,
        'Could not satisfy length'
      );
    });

    it('stat of new file', async () => {
      const storage = createStorage();
      const directory = storage.createDirectory();
      const file = directory.getOrCreateFile(randomText());
      expect((await file.stat()).size).toBe(0);
    });
  });
}
