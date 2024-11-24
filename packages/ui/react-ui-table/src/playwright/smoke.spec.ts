//
// Copyright 2024 DXOS.org
//

import { expect, test } from '@playwright/test';

import { setupPage } from '@dxos/test-utils/playwright';

import { TableManager } from './TableManager';

const storyId = 'ui-react-ui-table-table';
const storyUrl = `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

// NOTE(ZaymonFC): This test suite relies on the faker seed being set to 0 in the story.
test.describe('Table', () => {
  test('Loads', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });

    // (select, name, email, salary, manager, actions) * (header + 10 rows).
    await expect(page.getByRole('gridcell')).toHaveCount(66);
    await page.close();
  });

  test('sort', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.sortColumn(0, 'descending');
    await expect(page.getByRole('gridcell').nth(16)).toHaveText('Uwe Øvergård');
    await expect(page.getByRole('gridcell').nth(52)).toContainText('Anita');

    await table.sortColumn(0, 'ascending');
    await expect(page.getByRole('gridcell').nth(16)).toContainText('Anita');
    await expect(page.getByRole('gridcell').nth(52)).toHaveText('Uwe Øvergård');
    await page.close();
  });

  test('delete row', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.deleteRow(0);
    await expect(page.getByRole('gridcell', { name: 'Anita Mayer' })).toHaveCount(0);
    await page.close();
  });

  test('delete row--select all', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.toggleSelectAll();
    await table.deleteRow(0);

    await expect(page.getByRole('gridcell', { name: 'Anita Mayer' })).toHaveCount(0);
    await expect(page.getByRole('gridcell', { name: 'Phonthip Sigurjónsson' })).toHaveCount(0);
    await expect(page.getByRole('gridcell')).toHaveCount(6);
    await page.close();
  });

  test('delete column', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.deleteColumn(0);
    await expect(page.getByRole('gridcell')).toHaveCount(55);

    await table.deleteColumn(0);
    await expect(page.getByRole('gridcell')).toHaveCount(44);

    await table.deleteColumn(0);
    await expect(page.getByRole('gridcell')).toHaveCount(33);

    await page.getByTestId('table-column-settings-button').nth(0).click();
    await expect(page.getByTestId('column-delete')).toHaveCount(0);
    await page.close();
  });

  // Rest of add column test remains the same as it's a more complex flow
  test('add column', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    const newColumnLabel = 'TEST LABEL';

    await table.addColumn({ label: newColumnLabel, format: 'number' });

    // Delete first two columns to get the new column into view
    await table.deleteColumn(0);
    await table.deleteColumn(0);

    await expect(page.getByRole('gridcell', { name: newColumnLabel })).toBeVisible();
    await page.close();
  });
});
