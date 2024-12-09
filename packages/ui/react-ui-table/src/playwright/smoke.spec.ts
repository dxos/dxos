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
    const table = new TableManager(page);

    // (name, email, salary, manager) * 10 rows.
    await table.grid.ready();
    await expect(table.grid.cellsWithinPlane('grid')).toHaveCount(40);
    await page.close();
  });

  test('sort', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    await table.sortColumn(0, 'descending');
    await expect(table.grid.cell(0, 0, 'grid')).toHaveText('Uwe Øvergård');
    await expect(table.grid.cell(0, 9, 'grid')).toContainText('Anita');

    await table.sortColumn(0, 'ascending');
    await expect(table.grid.cell(0, 0, 'grid')).toContainText('Anita');
    await expect(table.grid.cell(0, 9, 'grid')).toHaveText('Uwe Øvergård');
    await page.close();
  });

  test('delete row', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    await table.deleteRow(0);
    await expect(page.getByRole('gridcell', { name: 'Anita Mayer' })).toHaveCount(0);
    await page.close();
  });

  test('delete row--select all', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    await table.toggleSelectAll();

    // Delete action affects all selected rows.
    await table.deleteRow(0);

    await expect(page.getByRole('gridcell', { name: 'Anita Mayer' })).toHaveCount(0);
    await expect(page.getByRole('gridcell', { name: 'Phonthip Sigurjónsson' })).toHaveCount(0);
    await expect(table.grid.cellsWithinPlane('grid')).toHaveCount(0);
    await page.close();
  });

  test('delete column', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    await table.deleteColumn(0);
    await expect(table.grid.cellsWithinPlane('grid')).toHaveCount(30);

    await table.deleteColumn(0);
    await expect(table.grid.cellsWithinPlane('grid')).toHaveCount(20);

    await table.deleteColumn(0);
    await expect(table.grid.cellsWithinPlane('grid')).toHaveCount(10);

    await page.getByTestId('table-column-settings-button').nth(0).click();

    // Ensure that the delete menu item is not visible when there is only one column left.
    await expect(page.getByTestId('column-delete')).toHaveCount(0);
    await page.close();
  });

  // Rest of add column test remains the same as it's a more complex flow
  test('add column', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    const newColumnLabel = 'TEST LABEL';

    await table.addColumn({ label: newColumnLabel, format: 'number' });

    await expect(page.getByRole('gridcell', { name: newColumnLabel })).toBeVisible();
    await page.close();
  });
});
