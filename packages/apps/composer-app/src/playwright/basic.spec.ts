//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

import { log } from '@dxos/log';
// TODO(wittjosiah): Importing this causes tests to fail.
// import { StackPlugin } from '@dxos/plugin-stack';

import { AppManager, INITIAL_URL } from './app-manager';
import { INITIAL_OBJECT_COUNT } from './constants';
import { Markdown, StackPlugin } from './plugins';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

test.describe('Basic tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('create identity, space is created by default', async () => {
    await expect(host.page.getByTestId('spacePlugin.spaces')).toBeVisible();
    const plank = host.deck.plank();
    await expect(Markdown.getMarkdownTextboxWithLocator(plank.locator).first()).toHaveText(/.+/);
  });

  test('create space, which is displayed in tree', async () => {
    await host.createSpace();
    await expect(host.getSpaceItems()).toHaveCount(2);
  });

  test('create document', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document', nth: 0 });

    const plank = host.deck.plank();
    const textBox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    await expect(host.getObjectLinks()).toHaveCount(INITIAL_OBJECT_COUNT + 1);
    await expect(textBox).toBeEditable();
  });

  // TODO(wittjosiah): Reset no longer wipes old data, upgrade path needs to be provided.
  test.skip('error boundary is rendered on invalid storage version, reset wipes old data', async ({ browserName }) => {
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
    // Wait for identity to be re-created.
    await expect(host.getSpaceItems()).toHaveCount(1, { timeout: 10_000 });
  });

  test('reset app', async ({ browserName }) => {
    // TODO(wittjosiah): This test seems to be flaky in webkit.
    if (browserName === 'webkit') {
      test.skip();
    }

    await host.openPluginRegistry();
    await host.getPluginToggle(StackPlugin.meta.id).click();
    await expect(host.getPluginToggle(StackPlugin.meta.id)).toBeChecked();

    await host.page.goto(INITIAL_URL + '?throw');
    await host.reset();

    await host.openPluginRegistry();
    await expect(host.getPluginToggle(StackPlugin.meta.id)).not.toBeChecked();
  });

  test('reset device', async ({ browserName }) => {
    test.setTimeout(60_000);

    // TODO(wittjosiah): This test seems to be flaky in firefox & webkit.
    if (browserName !== 'chromium') {
      test.skip();
    }

    await host.createSpace();
    await expect(host.getSpaceItems()).toHaveCount(2);

    await host.openUserDevices();
    await host.resetDevice();
    // Wait for reset to complete and attempt to reload.
    await host.page.waitForRequest(INITIAL_URL, { timeout: 45_000 });
    await expect(host.getSpaceItems()).toHaveCount(1, { timeout: 10_000 });
  });
});
