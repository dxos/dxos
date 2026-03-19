//
// Copyright 2024 DXOS.org
//

import { expect, test } from '@playwright/test';

import { faker } from '@dxos/random';

import { AppManager } from './app-manager';
import { Table } from './plugins';

faker.seed(0);

// TODO(wittjosiah): Fix table tests.
test.describe.skip('Table tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
    await host.createSpace();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('create', async () => {
    await host.createObject({ type: 'Table' });

    const title = faker.lorem.sentence();
    await Table.createTable(host.page, title);

    await expect(Table.getDataRow(host.page)).toHaveCount(1);
  });

  test('can add rows', async () => {
    await host.createObject({ type: 'Table' });

    const title = faker.lorem.sentence();
    await Table.createTable(host.page, title);

    await expect(Table.getDataRow(host.page)).toHaveCount(1);

    const cell = Table.getDataRow(host.page).last().getByTestId('table.cell').first();
    await cell.click();
    await host.page.keyboard.type('test');
    await host.page.keyboard.press('Enter');

    await expect(Table.getDataRow(host.page)).toHaveCount(2);

    const cell2 = Table.getDataRow(host.page).last().getByTestId('table.cell').first();
    await cell2.click();
    await host.page.keyboard.type('test2');
    await host.page.keyboard.press('Enter');

    await expect(Table.getDataRow(host.page)).toHaveCount(3);
  });

  test('can delete rows', async () => {
    await host.createObject({ type: 'Table' });
    const title = faker.lorem.sentence();
    await Table.createTable(host.page, title);
    await expect(Table.getDataRow(host.page)).toHaveCount(1);

    const ROWS = 5;
    for (let i = 0; i < ROWS; i++) {
      const cell = Table.getDataRow(host.page).last().getByTestId('table.cell').first();
      await cell.click();
      await host.page.keyboard.type('test');
      await host.page.keyboard.press('Enter');
      // sleep for a while to make sure the row is added
      await host.page.waitForTimeout(100);
      await expect(Table.getDataRow(host.page)).toHaveCount(i + 2);
    }

    for (let i = 0; i < ROWS; i++) {
      await Table.getDeleteRowButton(host.page).first().click();
      await expect(Table.getDataRow(host.page)).toHaveCount(ROWS - i);
    }

    await expect(Table.getDataRow(host.page)).toHaveCount(1);
  });

  test('can add columns', async () => {
    await host.createObject({ type: 'Table' });
    const title = faker.lorem.sentence();
    await Table.createTable(host.page, title);
    await expect(Table.getHeaderCell(host.page)).toHaveCount(2);

    await Table.getAddColumnButton(host.page).click();

    await expect(Table.getHeaderCell(host.page)).toHaveCount(3);
  });

  test('can delete columns', async () => {
    await host.createObject({ type: 'Table' });
    const title = faker.lorem.sentence();
    await Table.createTable(host.page, title);

    const COLUMNS = 4;
    await expect(Table.getHeaderCell(host.page)).toHaveCount(2);

    for (let i = 0; i < COLUMNS; i++) {
      await Table.getAddColumnButton(host.page).click();
      await expect(Table.getHeaderCell(host.page)).toHaveCount(3 + i);
    }

    await expect(Table.getHeaderCell(host.page)).toHaveCount(2 + COLUMNS);

    for (let i = 0; i < COLUMNS; i++) {
      await Table.getColumnMenu(host.page).last().click();
      await Table.getOpenColumnSettings(host.page).click();
      await Table.getColumnSettingsDelete(host.page).click();
      await expect(Table.getHeaderCell(host.page)).toHaveCount(2 + COLUMNS - i - 1);
    }

    await expect(Table.getHeaderCell(host.page)).toHaveCount(2);
  });

  test('can rename columns', async () => {
    await host.createObject({ type: 'Table' });
    const title = faker.lorem.sentence();

    await Table.createTable(host.page, title);
    await expect(Table.getHeaderCell(host.page)).toHaveCount(2);

    await Table.getAddColumnButton(host.page).click();
    await expect(Table.getHeaderCell(host.page)).toHaveCount(3);

    const newColumnName = faker.lorem.word();

    await Table.getColumnMenu(host.page).last().click();
    await Table.getOpenColumnSettings(host.page).click();
    await Table.getColumnSettingsLabel(host.page).fill(newColumnName);
    await Table.getColumnSettingsSave(host.page).click();

    await expect(Table.getHeaderCell(host.page).nth(1)).toHaveText(newColumnName);
  });
});
