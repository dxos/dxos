//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import pify from 'pify';

import { IFile, IStorage, STORAGE_RAM } from './interfaces';

// eslint-disable-next-line jest/no-export
export function storageTests (testGroupName: string, createStorage: () => IStorage) {
  const randomText = () => Math.random().toString(36).substring(2);

  const writeAndCheck = async (file: IFile, data: Buffer, offset = 0) => {
    await pify(file.write.bind(file))(offset, data);
    const bufferRead = await pify(file.read.bind(file))(offset, data.length);
    const result = data.equals(bufferRead);
    expect(result).toBeTruthy();
  };

  // eslint-disable-next-line jest/valid-title
  describe(testGroupName, () => {
    it('open & close', async () => {
      const storage = createStorage();
      const fileName = randomText();
      const file = storage.createOrOpen(fileName);
      await pify(file.close.bind(file))();
    });

    it('open file, read & write', async () => {
      const storage = createStorage();
      const fileName = randomText();
      const file = storage.createOrOpen(fileName);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const _ of Array.from(Array(5))) {
        const offset = Math.round(Math.random() * 1000);
        const buffer = Buffer.from(randomText());
        await writeAndCheck(file, buffer, offset);
      }

      await pify(file.close.bind(file))();
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
        await pify(file.close.bind(file))();
      }
    });

    // TODO(yivlad): Not implemented.
    it.skip('destroy clears all data', async function () {
      const storage = createStorage();

      const fileName = randomText();
      const file = storage.createOrOpen(fileName);

      const buffer = Buffer.from(randomText());
      await writeAndCheck(file, buffer);

      await storage.delete(fileName);
      const { size } = await pify(file.stat.bind(file))();
      expect(size).toBe(0);

      await pify(file.close.bind(file))();
    });

    it('subdirectories', async () => {
      let storage = createStorage();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const _ of Array.from(Array(5))) {
        storage = storage.subDir(randomText());
      }

      const file = storage.createOrOpen(randomText());

      const buffer = Buffer.from(randomText());
      await writeAndCheck(file, buffer);

      await pify(file.close.bind(file))();
    });

    it('destroys file', async function () {
      const storage = createStorage();

      // TODO(yivlad): Works only for STORAGE_RAM
      if (storage.type !== STORAGE_RAM) {
        this.skip();
      }

      const fileName = randomText();
      const file = storage.createOrOpen(fileName);

      const buffer = Buffer.from(randomText());
      await writeAndCheck(file, buffer);

      await pify(file.destroy.bind(file))();

      const reopened = storage.createOrOpen(fileName);
      const { size } = await pify(reopened.stat.bind(reopened))();
      expect(size).toBe(0);
      await pify(reopened.close.bind(reopened))();
    });
  });
}
