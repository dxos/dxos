//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import assert from 'node:assert';

import { File, Storage, StorageType } from './api';

// eslint-disable-next-line jest/no-export
export function storageTests (testGroupName: string, createStorage: () => Storage) {
  const randomText = () => Math.random().toString(36).substring(2);

  const writeAndCheck = async (file: File, data: Buffer, offset = 0) => {
    await file.write(offset, data);
    const bufferRead = await file.read(offset, data.length);
    const result = data.equals(bufferRead);
    expect(result).toBeTruthy();
  };

  // eslint-disable-next-line jest/valid-title
  describe(testGroupName, () => {
    it('open & close', async () => {
      const storage = createStorage();
      const directory = storage.directory('');
      const fileName = randomText();
      const file = directory.createOrOpen(fileName);
      await file.close();
    });

    it('open file, read & write', async () => {
      const storage = createStorage();
      const fileName = randomText();
      const directory = storage.directory('');
      const file = directory.createOrOpen(fileName);

      // eslint-disable-next-line unused-imports/no-unused-vars
      for (const _ of Array.from(Array(5))) {
        const offset = Math.round(Math.random() * 1000);
        const buffer = Buffer.from(randomText());
        await writeAndCheck(file, buffer, offset);
      }

      await file.close();
    });

    it('multiple files', async () => {
      const storage = createStorage();
      const directory = storage.directory('');

      const files = Array.from(Array(10))
        .map(() => randomText())
        .map(fileName => directory.createOrOpen(fileName));

      for (const file of files) {
        const buffer = Buffer.from(randomText());
        await writeAndCheck(file, buffer);
      }

      for (const file of files) {
        await file.close();
      }
    });

    it('reads from empty file', async function () {
      const storage = createStorage();
      const directory = storage.directory('');

      // TODO(yivlad): Doesn't work for node.
      if (storage.type === StorageType.NODE) {
        this.skip();
      }
      const fileName = randomText();
      const file = directory.createOrOpen(fileName);

      const { size } = await file.stat();
      expect(size).toBe(0);
    });

    it('reopen', async () => {
      // Open.
      const storage = createStorage();
      const directory = storage.directory('');
      const fileName = randomText();
      const file = directory.createOrOpen(fileName);

      // Write & close.
      await writeAndCheck(file, Buffer.from(randomText()));
      await file.close();

      // Open again.
      const file2 = directory.createOrOpen('EchoMetadata');
      // Write & close.
      await writeAndCheck(file2, Buffer.from(randomText()));
      await file2.close();
    });

    it('reopen and check if data is the same', async () => {
      // Open.
      const storage = createStorage();
      const fileName = randomText();
      const data = Buffer.from(randomText());
      const directory = storage.directory('');
      const file = directory.createOrOpen(fileName);

      // Write & close.
      await writeAndCheck(file, data);
      await file.close();

      // Open again.
      const file2 = directory.createOrOpen(fileName);

      // Read and check inside.
      const dataFromFile = await file2.read(0, data.length);
      expect(dataFromFile).toEqual(data);
      await file2.close();
    });

    // TODO(yivlad): Not implemented.
    it.skip('destroy clears all data', async () => {
      const storage = createStorage();
      const directory = storage.directory('');

      const fileName = randomText();
      const file = directory.createOrOpen(fileName);

      const buffer = Buffer.from(randomText());
      await writeAndCheck(file, buffer);

      await storage.destroy();
      const { size } = await file.stat();
      expect(size).toBe(0);

      await file.close();
    });

    it('subdirectories', async () => {
      // 1. Create storage and two subdirectories
      const storage = createStorage();
      const dir1 = storage.directory('dir1');
      const dir2 = storage.directory('dir2');

      const fileName = 'file';
      const buffer1 = Buffer.from(randomText());
      const buffer2 = Buffer.from(randomText());

      // 2. Create a file in first subdirectory and write content
      const file1 = dir1.createOrOpen(fileName);
      await file1.write(0, buffer1);

      // 3. Create a file with the same name in the second subdir and write different content
      const file2 = dir2.createOrOpen(fileName);
      await file2.write(0, buffer2);

      // 4. Check that they have corrent content.
      expect(await file1.read(0, buffer1.length)).toEqual(buffer1);
      expect(await file2.read(0, buffer2.length)).toEqual(buffer2);
    });

    it('write in directory/subDirectory/file', async () => {
      const storage = createStorage();
      const dir = storage.directory('directory');
      const subDir = dir.directory('subDirectory');

      const file = subDir.createOrOpen('file');
      const buffer = Buffer.from(randomText());
      await file.write(0, buffer);

      const readBuffer = await file.read(0, buffer.length);
      expect(readBuffer).toEqual(buffer);
      await file.close();
    });

    it('delete file', async function () {
      const storage = createStorage();
      const directory = storage.directory('');

      // TODO(yivlad): Works only for StorageType.RAM.
      if (storage.type !== StorageType.RAM) {
        this.skip();
      }

      const fileName = randomText();
      const file = directory.createOrOpen(fileName);

      const buffer = Buffer.from(randomText());
      await writeAndCheck(file, buffer);

      await file.delete();

      const reopened = directory.createOrOpen(fileName);
      const { size } = await reopened.stat();
      expect(size).toBe(0);
      await reopened.close();
    });

    it('delete directory', async () => {
      const storage = createStorage();
      const directory = storage.directory('');
      const file = directory.createOrOpen('file');

      const buffer = Buffer.from(randomText());
      await writeAndCheck(file, buffer);

      await directory.delete();
      await assert.rejects(async () => await file.read(0, buffer.length), Error, 'Closed');
    });

    it('truncate file', async function () {
      const storage = createStorage();
      if (storage.type === StorageType.IDB) {
        // File.truncate() throws 'Not deletable' error for IDb.
        this.skip();
      }
      const directory = storage.directory('');
      const file = directory.createOrOpen(randomText());

      const buffer1 = Buffer.from(randomText());
      await file.write(0, buffer1);
      const buffer2 = Buffer.from(randomText());
      await file.write(buffer1.length, buffer2);
      expect((await file.stat()).size).toBe(buffer1.length + buffer2.length);

      await file.truncate(buffer1.length, buffer2.length);
      expect((await file.stat()).size).toBe(buffer1.length);
      expect(await file.read(0, buffer1.length)).toStrictEqual(buffer1);
      await assert.rejects(async () => await file.read(buffer1.length, buffer2.length), Error, 'Could not satisfy length');
    });
  });
}
