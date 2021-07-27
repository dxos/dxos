//
// Copyright 2021 DXOS.org
//

/* global page, PATH */

import { STORAGE_RAM, STORAGE_CHROME, STORAGE_IDB } from './storage-types';

jest.setTimeout(50000);

const ROOT_DIRECTORY = 'testing';

const testWrite = async (page) => {
  await expect(page.evaluate(() => {
    const { storage, testWrite } = window;
    return testWrite(storage('file1'));
  })).resolves.toBe(true);

  await expect(page.evaluate(() => {
    const { storage } = window;
    return storage._storage._files.size;
  })).resolves.toBe(1);
};

const testDestroy = async (page) => {
  await expect(page.evaluate(async () => {
    const { storage } = window;
    await storage.destroy();
    return storage._storage._files.size;
  })).resolves.toBe(0);
};

describe('testing browser storages', () => {
  beforeEach(async () => {
    await page.goto(PATH, { waitUntil: 'load' });
    await page.evaluate(() => {
      window.testWrite = async (file) => {
        const buffer = Buffer.from('test');
        await window.pify(file.write.bind(file))(10, buffer);
        const bufferRead = await window.pify(file.read.bind(file))(10, 4);
        return buffer.equals(bufferRead);
      };
    });
  });

  test('chrome file storage by default', async () => {
    const storage = await page.evaluate((root) => {
      const { createStorage } = window.testModule;
      window.storage = createStorage(root);
      return window.storage;
    }, ROOT_DIRECTORY);

    expect(storage.root).toBe(ROOT_DIRECTORY);
    expect(storage.type).toBe(STORAGE_CHROME);

    await testWrite(page);

    await expect(page.evaluate(async () => {
      const { storage } = window;
      return (await storage._storage.getDirectory()).isDirectory;
    })).resolves.toBe(true);

    await testDestroy(page);

    await expect(page.evaluate(async () => {
      const { storage } = window;
      try {
        await storage._storage.getDirectory();
      } catch (err) {
        return err.message;
      }
    })).resolves.toMatch(/directory could not be found/);
  });

  test('idb storage', async () => {
    const storage = await page.evaluate((root, type) => {
      const { createStorage } = window.testModule;
      window.storage = createStorage(root, type);
      return window.storage;
    }, ROOT_DIRECTORY, STORAGE_IDB);

    expect(storage.root).toBe(ROOT_DIRECTORY);
    expect(storage.type).toBe(STORAGE_IDB);

    await testWrite(page);

    // Test database exists
    await page.evaluate(() => {
      window.testExists = (root) => {
        let exists = true;
        const request = window.indexedDB.open(root);
        request.onupgradeneeded = (e) => {
          e.target.transaction.abort();
          exists = false;
        };
        return new Promise(resolve => {
          request.onsuccess = () => {
            resolve(exists);
          };
          request.onerror = () => {
            resolve(exists);
          };
        });
      };
    });

    await expect(page.evaluate(root => window.testExists(root), ROOT_DIRECTORY)).resolves.toBe(true);

    await testDestroy(page);

    await expect(page.evaluate(root => window.testExists(root), ROOT_DIRECTORY)).resolves.toBe(false);
  });

  test('ram storage', async () => {
    const storage = await page.evaluate((root, type) => {
      const { createStorage } = window.testModule;
      window.storage = createStorage(root, type);
      return window.storage;
    }, ROOT_DIRECTORY, STORAGE_RAM);

    expect(storage.root).toBe(ROOT_DIRECTORY);
    expect(storage.type).toBe(STORAGE_RAM);

    await testWrite(page);

    await testDestroy(page);
  });
});
