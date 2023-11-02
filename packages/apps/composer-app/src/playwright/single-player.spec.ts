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
    expect(await host.page.getByTestId('spacePlugin.personalSpace').isVisible()).to.be.true;
    expect(await host.page.getByTestId('spacePlugin.allSpaces').isVisible()).to.be.true;
    expect(await host.getMarkdownTextbox().textContent()).to.exist;
  });

  test('create space, which is displayed in tree', async () => {
    await host.createSpace();
    await waitForExpect(async () => {
      expect(await host.getSpaceItemsCount()).to.equal(2);
    });
  });

  test('create document', async () => {
    await host.createSpace();
    await host.createDocument();
    const textBox = await host.getMarkdownTextbox();
    await waitForExpect(async () => {
      expect(await host.getDocumentItemsCount()).to.equal(2);
      expect(await textBox.isEditable()).to.be.true;
    });
  });
});
