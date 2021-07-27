//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import 'source-map-support/register';
import { STORAGE_CHROME, STORAGE_IDB, STORAGE_RAM } from './storage-types';
import pify from 'pify';
import { createStorage } from './browser';

const ROOT_DIRECTORY = 'testing';

describe('testing browser storages', () => {
  let storage: any;

  const testWrite = async () => {
    const file = storage('file1');
    const buffer = Buffer.from('test');
    await pify(file.write.bind(file))(10, buffer);
    const bufferRead = await pify(file.read.bind(file))(10, 4);
    const result = buffer.equals(bufferRead)
    expect(result).toBeTruthy();
  }

  const testDestroy = async () => {
    await storage.destroy();
  };

  beforeEach(async () => {
  });

  it('idb storage', async () => {
    storage = createStorage(ROOT_DIRECTORY, STORAGE_IDB);

    expect(storage.root).toBe(ROOT_DIRECTORY);
    expect(storage.type).toBe(STORAGE_IDB);

    await testWrite();

    // Test database exists
    // await page.evaluate(() => {
    //   window.testExists = (root) => {
    //     let exists = true;
    //     const request = window.indexedDB.open(root);
    //     request.onupgradeneeded = (e) => {
    //       e.target.transaction.abort();
    //       exists = false;
    //     };
    //     return new Promise(resolve => {
    //       request.onsuccess = () => {
    //         resolve(exists);
    //       };
    //       request.onerror = () => {
    //         resolve(exists);
    //       };
    //     });
    //   };
    // });

    // await expect(page.evaluate(root => window.testExists(root), ROOT_DIRECTORY)).resolves.toBe(true);

    await testDestroy();

    // await expect(page.evaluate(root => window.testExists(root), ROOT_DIRECTORY)).resolves.toBe(false);
  });

  it.skip('chrome file storage by default', async function () {
    if (browserMocha.context.browser !== 'chromium') {
      this.skip();
    }

    storage = createStorage(ROOT_DIRECTORY);

    expect(storage.root).toBe(ROOT_DIRECTORY);
    expect(storage.type).toBe(STORAGE_CHROME);

    await testWrite();

    expect((await storage._storage.getDirectory()).isDirectory).toBeTruthy();

    await testDestroy();

    const getDir = async (): Promise<string> => {
      try {
        await storage._storage.getDirectory();
        return ''
      } catch (err) {
        return err.message;
      }
    }

    const errorMessage = await getDir();
    expect(errorMessage).toMatch(/directory could not be found/)
  });

  it('ram storage', async () => {
    storage = createStorage(ROOT_DIRECTORY, STORAGE_RAM)

    expect(storage.root).toBe(ROOT_DIRECTORY);
    expect(storage.type).toBe(STORAGE_RAM);

    await testWrite();
    expect(storage._storage._files.size).toEqual(1);

    await testDestroy();
    expect(storage._storage._files.size).toEqual(0);
  });
});
