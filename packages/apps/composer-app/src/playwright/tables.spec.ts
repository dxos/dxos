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
  getHeaderRow: (page: Page) => page.getByTestId('table.header-row'),
  getDataRow: (page: Page) => page.getByTestId('table.data-row'),
} as const;

test.describe.only('Table tests', () => {
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
    await table.getNameInput(host.page).fill(title);
    await table.getContinueButton(host.page).click();

    // Expect the header row to be there
    await expect(table.getDataRow(host.page)).toHaveCount(1);
  });
});
