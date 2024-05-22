//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';
import { Markdown } from './plugins';

test.describe('Basic tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test('create identity, space is created by default', async () => {
    expect(await host.page.getByTestId('spacePlugin.personalSpace').isVisible()).to.be.true;
    expect(await host.page.getByTestId('spacePlugin.sharedSpaces').isVisible()).to.be.true;
    expect(await Markdown.getMarkdownTextbox(host.page).textContent()).to.exist;
  });

  test('create space, which is displayed in tree', async () => {
    await host.createSpace();
    await waitForExpect(async () => {
      expect(await host.getSpaceItemsCount()).to.equal(2);
    });
  });

  test('create document', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');
    const textBox = await Markdown.getMarkdownTextbox(host.page);
    await waitForExpect(async () => {
      expect(await host.getObjectsCount()).to.equal(2);
      expect(await textBox.isEditable()).to.be.true;
    });
  });

  test('error boundary is rendered on invalid storage version, reset wipes old data', async ({ browserName }) => {
    // TODO(wittjosiah): This test seems to crash firefox in CI.
    if (browserName === 'firefox') {
      test.skip();
    }

    await host.createSpace();
    await waitForExpect(async () => {
      expect(await host.getSpaceItemsCount()).to.equal(2);
    });

    await host.changeStorageVersionInMetadata(9999);
    expect(await host.page.getByTestId('resetDialog').locator('p').innerText()).to.contain('9999');
    expect(await host.page.getByTestId('resetDialog').locator('h2').innerText()).to.equal('Invalid storage version');

    await host.reset();
    await waitForExpect(async () => {
      expect(await host.getSpaceItemsCount()).to.equal(1);
    });
  });

  test('reset device', async ({ browserName }) => {
    // TODO(wittjosiah): Chromium playwright is having issues with shell rpc.
    if (browserName === 'chromium') {
      test.skip();
    }

    test.setTimeout(60_000);

    await host.createSpace();
    await waitForExpect(async () => {
      expect(await host.getSpaceItemsCount()).to.equal(2);
    });

    await host.openIdentityManager();
    await host.shell.resetDevice();
    await waitForExpect(async () => {
      expect(await host.getSpaceItemsCount()).to.equal(1);
    }, 15_000);
  });
});
