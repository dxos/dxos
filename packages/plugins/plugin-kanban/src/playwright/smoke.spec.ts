//
// Copyright 2024 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { BoardManager } from './board-manager';

const PORT = 9011;
const STORY_URL = storybookUrl('plugins-plugin-kanban-kanban--mutable-schema', PORT);

test.describe('Kanban MutableSchema', () => {
  let page: Page;
  let board: BoardManager;

  test.beforeEach(async ({ browser }) => {
    // Larger viewport to avoid triggering scroll-assist behaviour on simple drag operations.
    ({ page } = await setupPage(browser, { url: STORY_URL, viewportSize: { width: 1920, height: 1080 } }));
    board = new BoardManager(page.locator('body'));
    await board.waitUntilReady();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('rearrange columns', async () => {
    const col1Label = await board.column(1).title().textContent();
    const col2Label = await board.column(2).title().textContent();
    expect(col1Label).not.toBeNull();
    expect(col2Label).not.toBeNull();

    await board.column(1).dragTo(board.column(2).header());

    await expect(board.column(1).title()).toHaveText(col2Label!);
    await expect(board.column(2).title()).toHaveText(col1Label!);
  });

  test('rearrange within column', async () => {
    // Column 0 is uncategorized (empty). Use column 1 (first status column).
    const column = board.column(1);
    const countBefore = await column.items().count();

    const firstLabel = await column.item(0).title().textContent();
    const secondLabel = await column.item(1).title().textContent();
    expect(firstLabel).not.toBeNull();
    expect(secondLabel).not.toBeNull();

    // Drag first item below the second item.
    await column.item(0).dragTo(column.item(1).locator, { x: 0, y: 200 });

    // Item count should stay the same.
    await expect(column.items()).toHaveCount(countBefore);

    // The first item should now be what was previously the second item.
    await expect(column.item(0).title()).toHaveText(secondLabel!);

    // The original first item should now be at index 1.
    await expect(column.item(1).title()).toHaveText(firstLabel!);
  });

  test('drag to beginning of another column', async () => {
    // Column 0 is uncategorized (empty). Use columns 1 and 2 (both have items).
    const col1 = board.column(1);
    const col2 = board.column(2);

    const col1CountBefore = await col1.items().count();
    const col2CountBefore = await col2.items().count();
    const draggedLabel = await col1.item(0).title().textContent();
    expect(draggedLabel).not.toBeNull();

    // Drop above first item. Kanban cards are taller; use larger negative y so we land in top half.
    await col1.item(0).dragTo(col2.item(0).locator, { x: 0, y: -30 });

    await expect(col1.items()).toHaveCount(col1CountBefore - 1);
    await expect(col2.items()).toHaveCount(col2CountBefore + 1);
    await expect(col2.item(0).title()).toHaveText(draggedLabel!);
  });

  test('drag into empty column', async () => {
    // Uncategorized is column 0 (empty); first populated column is at index 1.
    const emptyColumn = board.column(0);
    const sourceColumn = board.column(1);

    const sourceCountBefore = await sourceColumn.items().count();
    const draggedLabel = await sourceColumn.item(0).title().textContent();
    expect(draggedLabel).not.toBeNull();

    await sourceColumn.item(0).dragTo(emptyColumn.header(), { x: 0, y: 40 });

    await expect(sourceColumn.items()).toHaveCount(sourceCountBefore - 1);
    await expect(emptyColumn.items()).toHaveCount(1);
    await expect(emptyColumn.item(0).title()).toHaveText(draggedLabel!);
  });

  test('create new item', async () => {
    // Use first populated column.
    const column = board.column(1);
    const countBefore = await column.items().count();

    await column.addItem();

    await expect(column.items()).toHaveCount(countBefore + 1);
  });
});
