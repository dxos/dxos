//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { log } from '@dxos/log';

import { AppManager } from './app-manager';
import { Markdown } from './plugins';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

test.describe('Basic tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('create identity, space is created by default', async () => {
    expect(await host.page.getByTestId('spacePlugin.spaces').isVisible()).to.be.true;
    const [editorPlank] = await host.planks.getPlanks({ filter: 'collection' });
    expect(await Markdown.getMarkdownTextboxWithLocator(editorPlank.locator).textContent()).to.exist;
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

    const [editorPlank] = await host.planks.getPlanks({ filter: 'markdown' });
    const textBox = Markdown.getMarkdownTextboxWithLocator(editorPlank.locator);

    await waitForExpect(async () => {
      expect(await host.getObjectsCount()).to.equal(1);
      expect(await textBox.isEditable()).to.be.true;
    });
  });

  test('error boundary is rendered on invalid storage version, reset wipes old data', async ({ browserName }) => {
    // TODO(wittjosiah): This test seems to crash firefox and fail in webkit.
    if (browserName !== 'chromium') {
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
    await host.createSpace();
    await waitForExpect(async () => {
      expect(await host.getSpaceItemsCount()).to.equal(2);
    });

    await host.openIdentityManager();
    await host.shell.resetDevice();
    // Wait for reset to complete and attempt to reload.
    await host.page.waitForRequest(host.page.url(), { timeout: 30_000 });
    await host.page.goto(host.initialUrl);
    await waitForExpect(async () => {
      expect(await host.getSpaceItemsCount()).to.equal(1);
    });
  });
});
