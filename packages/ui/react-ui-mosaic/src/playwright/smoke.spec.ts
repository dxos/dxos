//
// Copyright 2025 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { BoardManager } from './board-manager';

const PORT = 9008;
const STORY_URL = storybookUrl('ui-react-ui-mosaic-board--spec', PORT);

let page: Page;
let board: BoardManager;

test.describe('Board', () => {
  test.beforeEach(async ({ browser }) => {
    ({ page } = await setupPage(browser, { url: STORY_URL }));
    await page.getByTestId('board-column').first().waitFor({ state: 'visible' });
    board = new BoardManager(page.locator('body'));
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('rearrange columns', async () => {
    const col0Label = await board.column(0).title().textContent();
    const col1Label = await board.column(1).title().textContent();

    // Drag column 0 to the right of column 1.
    await board.column(0).dragTo(board.column(1).header());

    await expect(board.column(0).title()).toHaveText(col1Label!);
    await expect(board.column(1).title()).toHaveText(col0Label!);
  });

  test('rearrange within column', async () => {
    // Pick whichever column has more items for a reliable test.
    const col0Count = await board.column(0).items().count();
    const col1Count = await board.column(1).items().count();
    const colIndex = col0Count >= col1Count ? 0 : 1;
    const column = board.column(colIndex);
    const countBefore = Math.max(col0Count, col1Count);
    expect(countBefore).toBeGreaterThanOrEqual(2);

    const firstLabel = await column.item(0).title().textContent();
    const secondLabel = await column.item(1).title().textContent();

    // Drag first item below the second item.
    await column.item(0).dragTo(column.item(1).locator, { x: 0, y: 20 });

    // Item count should stay the same.
    await expect(column.items()).toHaveCount(countBefore);

    // The first item should now be what was previously the second item.
    await expect(column.item(0).title()).toHaveText(secondLabel!);

    // The original first item should now be at index 1.
    await expect(column.item(1).title()).toHaveText(firstLabel!);
  });

  test('drag to beginning of another column', async () => {
    const col0 = board.column(0);
    const col1 = board.column(1);

    const col0CountBefore = await col0.items().count();
    const col1CountBefore = await col1.items().count();
    const draggedLabel = await col0.item(0).title().textContent();

    // Drag above the first item in the target column.
    await col0.item(0).dragTo(col1.item(0).locator, { x: 0, y: -10 });

    await expect(col0.items()).toHaveCount(col0CountBefore - 1);
    await expect(col1.items()).toHaveCount(col1CountBefore + 1);
    await expect(col1.item(0).title()).toHaveText(draggedLabel!);
  });

  test('drag to middle of another column', async () => {
    const col0 = board.column(0);
    const col1 = board.column(1);

    const col0CountBefore = await col0.items().count();
    const col1CountBefore = await col1.items().count();
    const draggedLabel = await col0.item(0).title().textContent();

    // Drag to below the first item in the target column.
    await col0.item(0).dragTo(col1.item(0).locator, { x: 0, y: 10 });

    await expect(col0.items()).toHaveCount(col0CountBefore - 1);
    await expect(col1.items()).toHaveCount(col1CountBefore + 1);
    await expect(col1.items().getByRole('heading', { name: draggedLabel! })).toBeVisible();
  });

  test('drag to end of another column', async () => {
    const col0 = board.column(0);
    const col1 = board.column(1);

    const col0CountBefore = await col0.items().count();
    const col1CountBefore = await col1.items().count();
    const draggedLabel = await col0.item(0).title().textContent();

    // Hold ~20px above the footer to trigger pragmatic auto-scroll,
    // then drop on the last item once it scrolls into view.
    const footer = col1.locator.getByTestId('board-column-add-item');
    await col0.item(0).dragToEndWithAutoScroll(footer, col1.item(col1CountBefore - 1).locator, { x: 0, y: 20 });

    await expect(col0.items()).toHaveCount(col0CountBefore - 1);
    await expect(col1.items()).toHaveCount(col1CountBefore + 1);
    await expect(col1.items().getByRole('heading', { name: draggedLabel! })).toBeVisible();
  });

  test('drag into empty column', async () => {
    const col0 = board.column(0);
    const col2 = board.column(2);

    const col0CountBefore = await col0.items().count();
    await expect(col2.items()).toHaveCount(0);
    const draggedLabel = await col0.item(0).title().textContent();

    // Drag into the empty column body area.
    await col0.item(0).dragTo(col2.header(), { x: 0, y: 40 });

    await expect(col0.items()).toHaveCount(col0CountBefore - 1);
    await expect(col2.items()).toHaveCount(1);
    await expect(col2.item(0).title()).toHaveText(draggedLabel!);
  });

  test('create new item', async () => {
    const column = board.column(0);
    const countBefore = await column.items().count();

    await column.addItem();

    await expect(column.items()).toHaveCount(countBefore + 1);
  });
});
