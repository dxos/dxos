//
// Copyright 2021 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { asyncTimeout } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { type File, type Storage, StorageType } from '../common';

chai.use(chaiAsPromised);

export const randomText = () => Math.random().toString(36).substring(2);

export const storageTests = (testGroupName: StorageType, createStorage: () => Storage) => {
  const writeAndCheck = async (file: File, data: Buffer, offset = 0) => {
    await file.write(offset, data);
    const bufferRead = await file.read(offset, data.length);
    const result = data.equals(bufferRead);
    expect(result).to.be.true;
  };

  describe(testGroupName, () => {
    test('open & close', async () => {
      const storage = createStorage();
      const directory = storage.createDirectory();
      const fileName = randomText();
      const file = directory.getOrCreateFile(fileName);
      await file.close();
    });

    test('open file, read & write', async () => {
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

    test('list files', async () => {
      const storage = createStorage();
      const directoryName = randomText();
      const directory = storage.createDirectory(directoryName);

      const count = 10;
      const files = [...Array(count)].map((name) => directory.getOrCreateFile(randomText()));

      {
        // Create and check files amount.
        for (const file of files) {
          const buffer = Buffer.from(randomText());
          await writeAndCheck(file, buffer);
        }

        const entries = await directory.list();
        expect(entries.length).to.equal(count);
      }

      {
        // Check files amount after partial deletion.
        const amountToDelete = 5;
        const filesToDelete = files.slice(0, amountToDelete);
        for (const file of filesToDelete) {
          await file.destroy();
        }

        const entries = await directory.list();
        expect(entries.length).to.equal(count - amountToDelete);
      }

      // Cleanup.
      for (const file of files) {
        await file.close();
      }
    });

    test('read from empty file', async () => {
      const storage = createStorage();
      const directory = storage.createDirectory();

      const fileName = randomText();
      const file = directory.getOrCreateFile(fileName);
      const { size } = await file.stat();
      const data = await file.read(0, size);
      expect(Buffer.from('').equals(data)).to.be.true;
    });

    test('reopen and check if data is the same', async () => {
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
        expect(data1.equals(data2)).to.be.true;
        await file.close();
      }
    });

    test('destroy clears all data', async () => {
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
        expect(size).to.equal(0);
        await file.close();
      }
    });

    test('sub-directories', async () => {
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
      expect(await file1.read(0, buffer1.length)).to.deep.equal(buffer1);
      expect(await file2.read(0, buffer2.length)).to.deep.equal(buffer2);
    });

    test('write in directory/sub-directory/file', async () => {
      const storage = createStorage();
      const dir = storage.createDirectory('directory');
      const subDir = dir.createDirectory('subDirectory');

      const file = subDir.getOrCreateFile('file');
      const buffer = Buffer.from(randomText());
      await file.write(0, buffer);

      const readBuffer = await file.read(0, buffer.length);
      expect(readBuffer).to.deep.equal(buffer);
      await file.close();
    });

    test('delete directory', async () => {
      const storage = createStorage();
      const directory = storage.createDirectory();
      const file = directory.getOrCreateFile('file');

      const buffer = Buffer.from(randomText());
      await writeAndCheck(file, buffer);

      await directory.delete();
      await expect(file.read(0, buffer.length)).to.be.rejected;
    });

    test('del method', async () => {
      const storage = createStorage();

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
      await expect(file.read(buffer1.length, buffer2.length)).to.be.rejectedWith('Could not satisfy length');
    }).onlyEnvironments('nodejs'); // File.del() throws 'Not deletable' error for IDb.

    test('stat of new file', async () => {
      const storage = createStorage();
      const directory = storage.createDirectory();
      const file = directory.getOrCreateFile(randomText());
      expect((await file.stat()).size).to.equal(0);
    });

    test('call del with edge arguments', async () => {
      const storage = createStorage();
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
        expect((await file.stat()).size).to.equal(0);
      }

      {
        const file = directory.getOrCreateFile(randomText());
        await file.write(0, buffer);
        await file.del(1, buffer.length);
        expect((await file.stat()).size).to.equal(1);
      }

      {
        const file = directory.getOrCreateFile(randomText());
        await file.write(0, buffer);
        await file.del(0, -1);
        expect((await file.stat()).size).to.equal(buffer.length);
      }
    });

    test('reset', async () => {
      if (
        testGroupName === StorageType.RAM || // RAM storage does not persist data.
        testGroupName === StorageType.IDB // IDB storage is blocked by opened connection, and there is no handle to close it.
      ) {
        return;
      }
      const filename = randomText();
      const buffer = Buffer.from(randomText());

      {
        const storage = createStorage();
        const directory = storage.createDirectory();
        const file = directory.getOrCreateFile(filename);
        await file.write(0, buffer);
        await file.close();
      }

      {
        const storage = createStorage();
        const directory = storage.createDirectory();
        const file = directory.getOrCreateFile(filename);
        expect(await file.read(0, buffer.length)).to.deep.equal(buffer);
        await file.close();
      }

      {
        const storage = createStorage();
        await asyncTimeout(storage.reset(), 1_000);
      }

      {
        const storage = createStorage();
        const directory = storage.createDirectory();
        const file = directory.getOrCreateFile(filename);
        await expect(file.read(0, buffer.length)).to.be.rejected;
      }
    });

    test('list all files after reopen', async function () {
      if (testGroupName !== StorageType.WEBFS) {
        this.skip();
      }

      const dirname = randomText();

      const storage = createStorage();
      const directory = storage.createDirectory(dirname);

      {
        const entries = await directory.list();
        expect(entries.length).to.equal(0);
      }

      const files = [...Array(10)].map(() => directory.getOrCreateFile(randomText()));
      for (const file of files) {
        const buffer = Buffer.from(randomText());
        await writeAndCheck(file, buffer);
      }

      {
        const entries = await directory.list();
        expect(entries.length).to.equal(files.length);
      }

      {
        const storage = createStorage();
        const directory = storage.createDirectory(dirname);
        const entries = await directory.list();
        expect(entries.length).to.equal(files.length);
      }
    });
  });
};
