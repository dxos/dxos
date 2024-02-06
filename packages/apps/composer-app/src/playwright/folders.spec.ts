//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';

test.describe('Folder tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test('create folder', async () => {
    await host.createSpace();
    await host.createFolder();
    await waitForExpect(async () => {
      expect(await host.getFoldersCount()).to.equal(1);
    });
  });

  test.describe('deleting folder', () => {
    test('moves item out of folder', async () => {
      await host.createSpace();
      await host.createFolder();
      // Create an item inside the folder.
      await host.createObject('markdownPlugin');
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(2);
      });
      // Delete the containing folder.
      await host.deleteObject(0);

      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(2);
      });
    });

    test('moves folder with item out of folder', async () => {
      await host.createSpace();
      await host.createFolder();
      // Create a folder inside the folder.
      await host.createFolder();
      // Create an item inside the contained folder.
      await host.createObject('markdownPlugin');
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(2);
      });
      // Delete the containing folder.
      await host.deleteObject(0);

      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(2);
      });
    });
  });
});
