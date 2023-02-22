//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { beforeAll, describe, test } from '@dxos/test';

import { ExtensionManager } from './extension-manager';

/**
 * This is a basic smoke test for the extension.
 * It loads the extension and checks that the extension's pop-up is visible.
 */
// CircleCI does not support headed mode of Playwright.
// And Playwright does not support extensions in headless mode.
// So we skip this test on CI.
describe.skip('Basic test', () => {
  let extensionManager: ExtensionManager;

  beforeAll(async function () {
    extensionManager = new ExtensionManager(this);
  });

  test('our extension loads', async () => {
    await extensionManager.init();
    expect(await extensionManager.page.locator('body').textContent()).to.include(
      'Open the DXOS Developer Tools extension.'
    );
  });
});
