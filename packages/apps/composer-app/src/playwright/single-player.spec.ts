//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';

test.describe('Single-player tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test('create identity, space is created by default', async () => {
    await host.shell.createIdentity('host');
    await waitForExpect(async () => {
      expect(await host.isAuthenticated()).to.be.true;
      expect(await host.getSpaceItemsCount()).to.equal(1);
    });
  });

  test('create space, which is displayed in tree', async () => {
    await host.shell.createIdentity('host');
    await host.createSpace();
    await waitForExpect(async () => {
      expect(await host.getSpaceItemsCount()).to.equal(2);
    });
  });

  test('create document', async () => {
    await host.shell.createIdentity('host');
    await host.createDocument();
    const textBox = await host.getMarkdownTextbox();
    const title = await host.getDocumentTitleInput();
    await waitForExpect(async () => {
      expect(await host.getDocumentItemsCount()).to.equal(1);
      expect(await textBox.isEditable()).to.be.true;
      expect(await title.isEditable()).to.be.true;
    });
  });
});
