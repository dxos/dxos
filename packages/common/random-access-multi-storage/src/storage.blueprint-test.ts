//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { File, IStorage, StorageType } from './interfaces';

// eslint-disable-next-line jest/no-export
export function storageTests (testGroupName: string, createStorage: () => IStorage) {
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
      const fileName = randomText();
      const file = storage.createOrOpen(fileName);
      await file.close();
    });

    it('open file, read & write', async () => {
      const storage = createStorage();
      const fileName = randomText();
      const file = storage.createOrOpen(fileName);

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

      const files = Array.from(Array(10))
        .map(() => randomText())
        .map(fileName => storage.createOrOpen(fileName));

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

      // TODO(yivlad): Doesn't work for node.
      if (storage.type === StorageType.NODE) {
        this.skip();
      }
      const fileName = randomText();
      const file = storage.createOrOpen(fileName);

      const { size } = await file.stat();
      expect(size).toBe(0);
    });

    it('reopen', async () => {
      // Open.
      const storage = createStorage();
      const fileName = randomText();
      const file = storage.createOrOpen(fileName);

      // Write & close.
      await writeAndCheck(file, Buffer.from(randomText()));
      await file.close();

      // Open again.
      const file2 = storage.createOrOpen('EchoMetadata');
      // Write & close.
      await writeAndCheck(file2, Buffer.from(randomText()));
      await file2.close();
    });

    // TODO(yivlad): Not implemented.
    it.skip('destroy clears all data', async function () {
      const storage = createStorage();

      const fileName = randomText();
      const file = storage.createOrOpen(fileName);

      const buffer = Buffer.from(randomText());
      await writeAndCheck(file, buffer);

      await storage.delete(fileName);
      const { size } = await file.stat();
      expect(size).toBe(0);

      await file.close();
    });

    it('subdirectories', async function () {
      const rootStorage = createStorage();

      // TODO(yivlad): Doesn't work for StorageType.NODE.
      if (rootStorage.type === StorageType.NODE) {
        this.skip();
      }
      const fileName = randomText();
      const file1 = rootStorage.createOrOpen(fileName);

      const buffer1 = Buffer.from(randomText());
      await writeAndCheck(file1, buffer1);

      const childStorage1 = rootStorage.subDir('child1');
      const file2 = childStorage1.createOrOpen(fileName);
      const buffer2 = Buffer.from(randomText());
      await writeAndCheck(file2, buffer2);
      const bufferRead1 = await file1.read(0, buffer1.length);
      expect(buffer1.equals(bufferRead1));

      const childStorage2 = rootStorage.subDir('child2');
      const file3 = childStorage2.createOrOpen(fileName);
      const { size } = await file3.stat();
      expect(size).toBe(0);
      const buffer3 = Buffer.from(randomText());
      await writeAndCheck(file3, buffer3);
      const bufferRead2 = await file2.read(0, buffer2.length);
      expect(buffer2.equals(bufferRead2));

      await file1.close();
    });

    it('destroys file', async function () {
      const storage = createStorage();

      // TODO(yivlad): Works only for StorageType.RAM.
      if (storage.type !== StorageType.RAM) {
        this.skip();
      }

      const fileName = randomText();
      const file = storage.createOrOpen(fileName);

      const buffer = Buffer.from(randomText());
      await writeAndCheck(file, buffer);

      await file.destroy();

      const reopened = storage.createOrOpen(fileName);
      const { size } = await reopened.stat();
      expect(size).toBe(0);
      await reopened.close();
    });
  });
}
