//
// Copyright 2024 DXOS.org
//

import { expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { TableManager } from './TableManager';

const storyUrl = storybookUrl('ui-react-ui-table-table--default', 9004);

// NOTE(ZaymonFC): This test suite relies on the faker seed being set to 0 in the story.
test.describe('Table', () => {
  test('Loads', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    await page.close();
  });

  test('sort', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
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

  test('selection', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    // Select All
    await table.toggleSelectAll();
    await expect(table.selection(0)).toBeChecked();
    await expect(table.selection(1)).toBeChecked();
    await expect(table.selection(2)).toBeChecked();

    // Deselect All
    await table.toggleSelectAll();
    await expect(table.selection(0)).not.toBeChecked();
    await expect(table.selection(1)).not.toBeChecked();
    await expect(table.selection(2)).not.toBeChecked();

    await page.close();
  });

  test('delete row', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    await table.deleteRow(0);
    await expect(page.getByRole('gridcell', { name: 'Anita Mayer' })).toHaveCount(0);
    await page.close();
  });

  test('delete row--select all', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
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

  test('delete column', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    await table.deleteColumn(0);
    await expect(table.grid.cellsWithinPlane('grid')).toHaveCount(40);

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

  // Rest of add column test remains the same as it's a more complex flow.
  // TODO(ZaymonFC): Restore this after fixing format selection.
  test('add column', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    const newColumnLabel = 'TEST LABEL';

    await table.addColumn({ label: newColumnLabel, format: 'number' });

    await expect(page.getByRole('gridcell', { name: newColumnLabel })).toBeVisible();
    await page.close();
  });

  test('reference > reference / create new object', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();

    // Reference existing object.
    // Scroll over to the manager column.
    await table.grid.panByWheel(10000, 0);

    await table.grid.cell(4, 0, 'grid').click();
    await page.keyboard.press('A');
    await page.keyboard.press('N');
    await page.getByRole('option', { name: 'Anita Mayer' }).click();

    // Assert that the value is shown in the cell.
    await expect(page.getByRole('gridcell', { name: 'Anita Mayer' }).first()).toBeVisible();

    // Create new object.
    await table.grid.cell(4, 1, 'grid').click();
    await page.keyboard.type('t');
    await page.keyboard.type('e');
    await page.keyboard.type('s');
    await page.keyboard.type('t');
    await page.getByText('Create new object', { exact: false }).click();
    await page.getByTestId('save-button').click();

    // Scroll to the left.
    await page.getByRole('gridcell', { name: 'test' }).first().click();

    await page.close();
  });

  test('test toggles', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();

    await page.getByTestId('table-switch').first().click();
    await page.getByTestId('table-switch').nth(7).click();

    // Test that checks are durable in the data model by sorting.
    await table.sortColumn(3, 'descending');

    // Assert the first two switch checkboxes are checked.
    await expect(page.getByTestId('table-switch').first()).toBeChecked();
    await expect(page.getByTestId('table-switch').nth(1)).toBeChecked();
    await expect(table.grid.cell(0, 0, 'grid')).toHaveText('Anita Mayer');
    await expect(table.grid.cell(0, 1, 'grid')).toHaveText('Uwe Øvergård');

    await page.close();
  });
});
