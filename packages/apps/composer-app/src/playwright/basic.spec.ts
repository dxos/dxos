//
// Copyright 2023 DXOS.org
//

import { test, expect } from '@playwright/test';

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
    await expect(host.page.getByTestId('spacePlugin.spaces')).toBeVisible();
    const plank = host.deck.plank();
    await expect(Markdown.getMarkdownTextboxWithLocator(plank.locator)).toHaveText(/.+/);
  });

  test('create space, which is displayed in tree', async () => {
    await host.createSpace();
    await expect(host.getSpaceItems()).toHaveCount(2);
  });

  test('create document', async () => {
    await host.createSpace();
    await host.page.pause();
    await host.createObject('markdownPlugin');

    const plank = host.deck.plank();
    const textBox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    await expect(host.getObjectLinks()).toHaveCount(1);
    await expect(textBox).toBeEditable();
  });

  test('error boundary is rendered on invalid storage version, reset wipes old data', async ({ browserName }) => {
    // TODO(wittjosiah): This test seems to crash firefox and fail in webkit.
    if (browserName !== 'chromium') {
      test.skip();
    }

    await host.createSpace();
    await expect(host.getSpaceItems()).toHaveCount(2);

    await host.changeStorageVersionInMetadata(9999);
    await expect(host.page.getByTestId('resetDialog').locator('p')).toContainText('9999');
    await expect(host.page.getByTestId('resetDialog').locator('h2')).toHaveText('Invalid storage version');

    await host.reset();
    await expect(host.getSpaceItems()).toHaveCount(1);
  });

  test('reset device', async ({ browserName }) => {
    // TODO(wittjosiah): This test seems to be flaky in firefox & webkit.
    if (browserName !== 'chromium') {
      test.skip();
    }

    await host.createSpace();
    await expect(host.getSpaceItems()).toHaveCount(2);

    await host.openIdentityManager();
    await host.shell.resetDevice();
    // Wait for reset to complete and attempt to reload.
    await host.page.waitForRequest(host.page.url(), { timeout: 30_000 });
    await host.page.goto(host.initialUrl);
    await expect(host.getSpaceItems()).toHaveCount(1);
  });
});
