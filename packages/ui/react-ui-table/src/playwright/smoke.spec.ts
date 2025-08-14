//
// Copyright 2024 DXOS.org
//

import { expect, test } from '@playwright/test';

import { type DxGrid } from '@dxos/lit-grid';
import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { TableManager } from './TableManager';

const storyUrl = storybookUrl('ui-react-ui-table-table--default', 9004);
const relationsStoryUrl = storybookUrl('ui-react-ui-table-relations--default', 9004);

// NOTE(ZaymonFC): This test suite relies on the faker seed being set to 0 in the story.
test.describe('Table', () => {
  test('Loads', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    test.skip(browserName === 'firefox');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    await page.close();
  });

  test('sort', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    test.skip(browserName === 'firefox');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    await table.sortColumn(0, 'descending');
    await expect(table.grid.cell(0, 0, 'grid')).toHaveText('Sit.');
    await expect(table.grid.cell(0, 9, 'grid')).toContainText('Aut.');

    await table.sortColumn(0, 'ascending');
    await expect(table.grid.cell(0, 0, 'grid')).toContainText('Aut.');
    await expect(table.grid.cell(0, 9, 'grid')).toHaveText('Sit.');
    await page.close();
  });

  test('selection', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    test.skip(browserName === 'firefox');
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
    test.skip(browserName === 'firefox');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    await table.deleteRow(0);
    await expect(page.getByRole('gridcell', { name: 'Sapiente.' })).toHaveCount(0);
    await page.close();
  });

  test('delete row--select all', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    test.skip(browserName === 'firefox');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();
    await table.toggleSelectAll();

    // Delete action affects all selected rows.
    await table.deleteRow(0);

    await expect(page.getByRole('gridcell', { name: 'Sapiente.' })).toHaveCount(0);
    await expect(page.getByRole('gridcell', { name: 'Beatae.' })).toHaveCount(0);
    await expect(table.grid.cellsWithinPlane('grid')).toHaveCount(0);
    await page.close();
  });

  test('delete column', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    test.skip(browserName === 'firefox');
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
  test('add column', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    test.skip(browserName === 'firefox');
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
    test.skip(browserName === 'firefox');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();

    // Reference existing object.
    // Scroll over to the manager column.
    await table.grid.panByWheel(10000, 0);

    await table.grid.cell(4, 0, 'grid').click();
    // TODO(wittjosiah): Surprisingly long delay needed here.
    await page.keyboard.press('A', { delay: 1_000 });
    await page.keyboard.press('u', { delay: 1_000 });
    await page.getByRole('option', { name: 'Aut.' }).click();

    // Assert that the value is shown in the cell.
    await expect(page.getByRole('gridcell', { name: 'Aut.' }).first()).toBeVisible();

    // Create new object.
    await table.grid.cell(4, 1, 'grid').click();
    // TODO(wittjosiah): Surprisingly long delay needed here.
    await page.keyboard.type('t', { delay: 1_000 });
    await page.keyboard.type('e', { delay: 1_000 });
    await page.keyboard.type('s', { delay: 1_000 });
    await page.keyboard.type('t', { delay: 1_000 });
    await page.getByText('Create new object', { exact: false }).click();
    await page.getByTestId('save-button').click();

    // Scroll to the left.
    await page.getByRole('gridcell', { name: 'test' }).first().click();

    await page.close();
  });

  test('test toggles', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    test.skip(browserName === 'firefox');
    const { page } = await setupPage(browser, { url: storyUrl });
    const table = new TableManager(page);

    await table.grid.ready();

    await page.getByTestId('table-switch').first().click();
    await page.getByTestId('table-switch').nth(7).click();

    // Test that checks are durable in the data model by sorting.
    await table.sortColumn(1, 'descending');

    // Assert the first two switch checkboxes are checked.
    await expect(page.getByTestId('table-switch').first()).toBeChecked();
    await expect(page.getByTestId('table-switch').nth(1)).toBeChecked();
    await expect(table.grid.cell(0, 0, 'grid')).toHaveText('Sapiente.');
    await expect(table.grid.cell(0, 1, 'grid')).toHaveText('Beatae.');

    await page.close();
  });

  test('extant relations work as expected', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    test.skip(browserName === 'firefox');
    const { page } = await setupPage(browser, { url: relationsStoryUrl });

    // Wait for the page to load
    await page.locator('dx-grid > .dx-grid').nth(1).waitFor({ state: 'visible' });

    // Find the dx-grid element for the contactModel (second table)
    // The contactModel is used in the second Table.Main component in the story
    const dxGrid = page.locator('dx-grid').nth(1);
    await dxGrid.waitFor({ state: 'visible' });

    // Scroll to the last column (column 8)
    await dxGrid.evaluate(async (dxGridElement: DxGrid) => {
      dxGridElement.scrollToColumn(8);
    });

    // Click on the cell at aria-rowindex=0 aria-colindex=8 to focus it
    const targetCell = dxGrid.locator('[data-dx-grid-plane="grid"] [aria-rowindex="0"][aria-colindex="8"]');
    await targetCell.click();

    // Click again to engage edit mode
    await page.keyboard.press('Enter');
    await page.getByTestId('grid.cell-editor').waitFor({ state: 'visible' });

    // Type the first few letters of an org name.
    const orgName =
      (await page
        .locator('dx-grid')
        .nth(0)
        .locator('[data-dx-grid-plane="grid"] [aria-rowindex="0"][aria-colindex="0"] .dx-grid__cell__content')
        .textContent()) ?? 'never';
    await page.keyboard.type(orgName.substring(0, 4), { delay: 500 });

    // Assert that there is an element with aria-selected on the page
    await expect(page.locator('[role="option"][aria-selected]')).toBeVisible();

    // Type the enter key
    await page.keyboard.press('Enter');

    // Assert that the cell element has the org name
    await expect(targetCell).toHaveText(orgName);

    await page.close();
  });

  test('new relations work as expected', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit');
    test.skip(browserName === 'firefox');
    const { page } = await setupPage(browser, { url: relationsStoryUrl });

    // Wait for the page to load
    await page.locator('dx-grid > .dx-grid').nth(1).waitFor({ state: 'visible' });

    // Find the dx-grid element for the contactModel (second table)
    // The contactModel is used in the second Table.Main component in the story
    const dxGrid = page.locator('dx-grid').nth(1);
    await dxGrid.waitFor({ state: 'visible' });

    // Scroll to the last column (column 8)
    await dxGrid.evaluate(async (dxGridElement: DxGrid) => {
      dxGridElement.scrollToColumn(8);
    });

    // Click on the cell at aria-rowindex=0 aria-colindex=8 to focus it
    const targetCell = dxGrid.locator('[data-dx-grid-plane="grid"] [aria-rowindex="0"][aria-colindex="8"]');
    await targetCell.click();

    // Click again to engage edit mode
    await page.keyboard.press('Enter');
    await page.getByTestId('grid.cell-editor').waitFor({ state: 'visible' });

    // Type the first few letters of an org name.
    const orgName = 'Sally';
    await page.keyboard.type(orgName, { delay: 500 });

    // Assert that there is an element with aria-selected on the page
    await expect(page.locator('[role="option"][aria-selected]')).toBeVisible();

    // Type the enter key
    await page.keyboard.press('Enter');

    // Click the save button in the popover
    await page.getByTestId('save-button').click();

    // Assert that the cell element has the org name
    await expect(targetCell).toHaveText(orgName);

    await page.close();
  });
});
