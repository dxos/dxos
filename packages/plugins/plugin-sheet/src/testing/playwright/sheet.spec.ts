//
// Copyright 2021 DXOS.org
//

import { expect, test, type Page } from '@playwright/test';

import { faker } from '@dxos/random';
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

  test('basic interactions', async () => {
    // Cell editor should initially be hidden
    await expect(sheet.cellEditor()).not.toBeVisible();
    // Click on cell to focus it
    await sheet.grid.cell(0, 0, 'grid').click();
    // Cell editor should still be hidden
    await expect(sheet.cellEditor()).not.toBeVisible();
    // Click again to edit it
    await sheet.grid.cell(0, 0, 'grid').click();
    // Confirm editor displays
    await expect(sheet.cellEditor()).toBeVisible();
    // Type in a value and press enter
    const testString = faker.string.uuid();
    await page.keyboard.type(testString);
    // TODO(thure): Why do we need to wait? Enter is ignored otherwise…
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    // Expect that value to now show in the grid
    await expect(sheet.cellByText(testString)).toBeVisible();
  });
});
