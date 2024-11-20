// Copyright 2021 DXOS.org

import { expect, test } from '@playwright/test';

import { setupPage } from '@dxos/test-utils/playwright';

const storyId = 'ui-react-ui-table-table';
// TODO(ZaymonFC): Factor out.
const storyUrl = `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

// TODO(ZaymonFC): Workout a better way to index the main grid, attributes?

// const testIds = {
//   tableColumnSettingsButton: 'table-column-settings-button',
//   tableRowMenuButton: 'table-row-menu-button',
//   tableNewColumnButton: 'table-new-column-button',
// };

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
    await page.getByTestId('table-column-settings-button').nth(0).click();
    await page.getByTestId('column-sort-descending').click();

    // Expect the first gridcell to contain 'Uwe Øvergård'
    await expect(page.getByRole('gridcell').nth(16)).toHaveText('Uwe Øvergård');
    await expect(page.getByRole('gridcell').nth(52)).toContainText('Anita');

    await page.getByTestId('table-column-settings-button').nth(0).click();
    await page.getByTestId('column-sort-ascending').click();

    await expect(page.getByRole('gridcell').nth(16)).toContainText('Anita');
    await expect(page.getByRole('gridcell').nth(52)).toHaveText('Uwe Øvergård');
    await page.close();
  });

  test('delete row', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });
    await page.getByTestId('table-row-menu-button').nth(0).click();
    await page.getByTestId('row-menu-delete').click();

    await expect(page.getByRole('gridcell', { name: 'Anita Mayer' })).toHaveCount(0);

    await page.close();
  });

  test('delete row--select all', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });

    // Select all and delete.
    await page.getByTestId('table-selection').nth(0).click();
    await page.getByTestId('table-row-menu-button').nth(0).click();
    await page.getByTestId('row-menu-delete').click();

    // Check that the first and last rows have been deleted.
    await expect(page.getByRole('gridcell', { name: 'Anita Mayer' })).toHaveCount(0);
    await expect(page.getByRole('gridcell', { name: 'Phonthip Sigurjónsson' })).toHaveCount(0);

    // check that there are only x gridcells left
    await expect(page.getByRole('gridcell')).toHaveCount(6);

    await page.close();
  });

  test('delete column', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });

    // Delete name column.
    await page.getByTestId('table-column-settings-button').nth(0).click();
    await page.getByTestId('column-delete').click();

    // (select, email, salary, manager, actions) * (header + 10 rows).
    await expect(page.getByRole('gridcell')).toHaveCount(55);

    // keep deleting columns until one remains
    await page.getByTestId('table-column-settings-button').nth(0).click();
    await page.getByTestId('column-delete').click();
    await expect(page.getByRole('gridcell')).toHaveCount(44);

    await page.getByTestId('table-column-settings-button').nth(0).click();
    await page.getByTestId('column-delete').click();
    await expect(page.getByRole('gridcell')).toHaveCount(33);

    // Can't delete the final column.
    await page.getByTestId('table-column-settings-button').nth(0).click();
    await expect(page.getByTestId('column-delete')).toHaveCount(0);

    await page.close();
  });

  test('add column', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storyUrl });

    const newColumnLabel = 'TEST LABEL';

    await page.getByTestId('table-new-column-button').click();
    await page.getByRole('combobox').click();
    await page.getByLabel('format number').click();
    await page.getByPlaceholder('Property label.').click();
    await page.getByPlaceholder('Property label.').fill(newColumnLabel);
    await page.getByRole('button', { name: 'button save' }).click();

    // TODO(ZaymonFC): Talk with Will about a better way to circumvent table virtualization.
    // Delete first two columns to get the new column into view.
    await page.getByTestId('table-column-settings-button').nth(0).click();
    await page.getByTestId('column-delete').click();
    await page.getByTestId('table-column-settings-button').nth(0).click();
    await page.getByTestId('column-delete').click();

    await expect(page.getByRole('gridcell', { name: newColumnLabel })).toBeVisible();

    await page.close();
  });
});
