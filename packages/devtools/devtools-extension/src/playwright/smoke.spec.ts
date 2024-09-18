//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

import { ExtensionManager } from './extension-manager';

// CircleCI does not support headed mode of Playwright.
// And Playwright does not support extensions in headless mode.
// So we skip this test on CI.
test.describe.skip('Basic test', () => {
  let extensionManager: ExtensionManager;

  test.beforeAll(async ({ browserName }) => {
    extensionManager = new ExtensionManager(browserName);
  });

  test('our extension loads', async () => {
    await extensionManager.init();
    await expect(extensionManager.page.locator('body')).toHaveText('Open the DXOS Developer Tools extension.');
  });
});
