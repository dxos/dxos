//
// Copyright 2021 DXOS.org
//

import { test, type Page } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { SheetManager } from './sheet-manager';

test.describe('plugin-sheet', () => {
  let page: Page;
  let sheet: SheetManager;

  test.beforeEach(async ({ browser }) => {
    const setup = await setupPage(browser, {
      url: storybookUrl('plugins-plugin-sheet-gridsheet--basic'),
    });
    page = setup.page;
    sheet = new SheetManager(page);
    await sheet.ready();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('basic interactions', async () => {});
});
