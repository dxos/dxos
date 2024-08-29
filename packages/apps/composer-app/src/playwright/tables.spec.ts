//
// Copyright 2024 DXOS.org
//

import { expect, Page, test } from '@playwright/test';

import { faker } from '@dxos/random';

import { AppManager } from './app-manager';

faker.seed(0);

const table = {
  getNameInput: (page: Page) => page.getByTestId('table.settings.name'),
  getContinueButton: (page: Page) => page.getByTestId('table.settings.continue'),
  getHeaderCell: (page: Page) => page.getByTestId('table.header-cell'),
  getDataRow: (page: Page) => page.getByTestId('table.data-row'),
  createTable: async (page: Page, title: string) => {
    await table.getNameInput(page).fill(title);
    await table.getContinueButton(page).click();
  },
  getAddColumnButton: (page: Page) => page.getByTestId('table.new-column'),
  getDeleteRowButton: (page: Page) => page.getByTestId('table.delete-row'),
  getColumnMenu: (page: Page) => page.getByTestId('table.column-menu'),
  getOpenColumnSettings: (page: Page) => page.getByTestId('table.open-column-settings'),
  getColumnSettingsLabel: (page: Page) => page.getByTestId('table.column-settings.label'),
  getColumnSettingsDelete: (page: Page) => page.getByTestId('table.column-settings.delete'),
  getColumnSettingsSave: (page: Page) => page.getByTestId('table.column-settings.save'),
} as const;

test.describe('Table tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('create', async () => {
    await host.createSpace();
    await host.openSettings();
    await host.enablePlugin('dxos.org/plugin/table');
    await host.createObject('tablePlugin');

    const title = faker.lorem.sentence();
    await table.createTable(host.page, title);

    await expect(table.getDataRow(host.page)).toHaveCount(1);
  });

  test('can add rows', async () => {
    await host.createSpace();
    await host.openSettings();
    await host.enablePlugin('dxos.org/plugin/table');
    await host.createObject('tablePlugin');

    const title = faker.lorem.sentence();
    await table.createTable(host.page, title);

    await expect(table.getDataRow(host.page)).toHaveCount(1);

    const cell = table.getDataRow(host.page).last().getByTestId('table.cell').first();
    await cell.click();
    await host.page.keyboard.type('test');
    await host.page.keyboard.press('Enter');

    await expect(table.getDataRow(host.page)).toHaveCount(2);

    const cell2 = table.getDataRow(host.page).last().getByTestId('table.cell').first();
    await cell2.click();
    await host.page.keyboard.type('test2');
    await host.page.keyboard.press('Enter');

    await expect(table.getDataRow(host.page)).toHaveCount(3);
  });

  test('can delete rows', async () => {
    await host.createSpace();
    await host.openSettings();
    await host.enablePlugin('dxos.org/plugin/table');
    await host.createObject('tablePlugin');
    const title = faker.lorem.sentence();
    await table.createTable(host.page, title);
    await expect(table.getDataRow(host.page)).toHaveCount(1);

    const ROWS = 5;
    for (let i = 0; i < ROWS; i++) {
      const cell = table.getDataRow(host.page).last().getByTestId('table.cell').first();
      await cell.click();
      await host.page.keyboard.type('test');
      await host.page.keyboard.press('Enter');
      // sleep for a while to make sure the row is added
      await host.page.waitForTimeout(100);
      await expect(table.getDataRow(host.page)).toHaveCount(i + 2);
    }

    for (let i = 0; i < ROWS; i++) {
      await table.getDeleteRowButton(host.page).first().click();
      await expect(table.getDataRow(host.page)).toHaveCount(ROWS - i);
    }

    await expect(table.getDataRow(host.page)).toHaveCount(1);
  });

  test('can add columns', async () => {
    await host.createSpace();
    await host.openSettings();
    await host.enablePlugin('dxos.org/plugin/table');
    await host.createObject('tablePlugin');
    const title = faker.lorem.sentence();
    await table.createTable(host.page, title);
    await expect(table.getHeaderCell(host.page)).toHaveCount(2);

    await table.getAddColumnButton(host.page).click();

    await expect(table.getHeaderCell(host.page)).toHaveCount(3);
  });

  test('can delete columns', async () => {
    await host.createSpace();
    await host.openSettings();
    await host.enablePlugin('dxos.org/plugin/table');
    await host.createObject('tablePlugin');
    const title = faker.lorem.sentence();
    await table.createTable(host.page, title);

    const COLUMNS = 4;
    await expect(table.getHeaderCell(host.page)).toHaveCount(2);

    for (let i = 0; i < COLUMNS; i++) {
      await table.getAddColumnButton(host.page).click();
      await expect(table.getHeaderCell(host.page)).toHaveCount(3 + i);
    }

    await expect(table.getHeaderCell(host.page)).toHaveCount(2 + COLUMNS);

    for (let i = 0; i < COLUMNS; i++) {
      await table.getColumnMenu(host.page).last().click();
      await table.getOpenColumnSettings(host.page).click();
      await table.getColumnSettingsDelete(host.page).click();
      await expect(table.getHeaderCell(host.page)).toHaveCount(2 + COLUMNS - i - 1);
    }

    await expect(table.getHeaderCell(host.page)).toHaveCount(2);
  });
});
