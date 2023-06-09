//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';

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
    expect(await extensionManager.page.locator('body').textContent()).to.include(
      'Open the DXOS Developer Tools extension.',
    );
  });
});
