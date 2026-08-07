//
// Copyright 2024 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { BoardManager } from './board-manager';

const PORT = 9011;
const STORY_URL = storybookUrl('plugins-plugin-kanban-containers-kanban--mutable-schema', PORT);

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

  // TODO(wittjosiah): Deferred on webkit only — the column lands one position too far. Measured
  //   by dumping every column's title before and after the drag: dragging column 1 onto column 2
  //   yields `["<none>","Qualified","Prospect","Active",…]` when it passes and
  //   `["<none>","Qualified","Active","Prospect",…]` when it fails, so the drop resolves to the
  //   column *after* the intended one (location 3 rather than 2). The column count is stable at 6
  //   throughout, so this is not the source being filtered out of `useVisibleItems`. Rate is
  //   3-4 in 12 locally on webkit at either worker count, and it took out `e2e (webkit, 0)` in run
  //   31205230911. Three harness fixes were tried and reverted for lack of evidence: capturing the
  //   target as an `ElementHandle` before the drag (4/12), waiting for the source column to detach
  //   instead of sleeping 200ms (3/12), and aiming at an adjacent placeholder and confirming
  //   `data-mosaic-placeholder-state="active"` the way `ItemManager.dragTo` does (2/12) — the trend
  //   is the right shape but none of it is significant at these sample sizes. Two candidates remain
  //   unexcluded: the board sliding under a stationary cursor between aim and release (placeholder
  //   expansion or horizontal auto-scroll), and the index-space mismatch in
  //   `useKanbanColumnEventHandler`, which takes `sourceIndex` from `model.getColumns()` (the full
  //   list) but `targetIndex` from `target.location` (computed over visible items). Instrument
  //   `Root.onDrop`'s resolved target for this drag before changing anything else — that is what
  //   found the mosaic bugs.
  test.fixme('rearrange columns', async () => {
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
    await column.item(0).dragTo(column.item(1).locator, { x: 0, y: 200 }, 'bottom');

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

    // Drop above first item.
    await col1.item(0).dragTo(col2.item(0).locator, { x: 0, y: -30 }, 'top');

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
