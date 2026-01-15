//
// Copyright 2021 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { faker } from '@dxos/random';
import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { SheetManager } from './sheet-manager';

test.describe('plugin-sheet', () => {
  let page: Page;
  let sheet: SheetManager;

  test.beforeEach(async ({ browser }) => {
    const setup = await setupPage(browser, {
      url: storybookUrl('plugins-plugin-sheet-sheetcontainer--spec', 9005),
      viewportSize: { width: 1280, height: 720 },
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
    await sheet.setFocusedCellValue(testString, 'Enter');
    // Expect that value to now show in the grid
    await expect(sheet.cellByText(testString)).toBeVisible();
  });

  test('functions, row deletion, indexed positions', async () => {
    const firstNumber = 123;
    const secondNumber = 789;
    const thirdNumber = 567;
    // Input numbers
    await sheet.grid.cell(0, 2, 'grid').click();
    await sheet.setFocusedCellValue(`${firstNumber}`, 'Enter');
    await sheet.setFocusedCellValue(`${secondNumber}`, 'Enter');
    await sheet.setFocusedCellValue(`${thirdNumber}`, 'Enter');

    // Test range input
    await sheet.press('Enter');
    await sheet.fill('=SUM(');
    await sheet.selectRange({ col: 0, row: 2, plane: 'grid' }, { col: 0, row: 4, plane: 'grid' });
    await sheet.press(')');
    await sheet.commit('Enter');
    // Check sum
    await expect(sheet.grid.cell(0, 5, 'grid')).toHaveText(`${firstNumber + secondNumber + thirdNumber}`);
    // Delete row of second number
    await sheet.deleteAxis('row', 3);
    // Check sum again, it should be one cell up and reflect the updated range.
    await expect(sheet.grid.cell(0, 4, 'grid')).toHaveText(`${firstNumber + thirdNumber}`);
  });

  test('ranges', async () => {
    await sheet.selectRange({ col: 1, row: 0, plane: 'grid' }, { col: 1, row: 1, plane: 'grid' });
    await sheet.toolbarAction('alignment', 'center').click();
    await expect(await sheet.grid.cell(1, 0, 'grid')).toHaveAttribute('class', /text-center/);
    await expect(await sheet.grid.cell(1, 1, 'grid')).toHaveAttribute('class', /text-center/);
    await expect(sheet.rangeInList('B1:B2')).toBeVisible();
  });
});
