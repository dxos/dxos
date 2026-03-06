//
// Copyright 2025 DXOS.org
//

import type { Locator, Page } from '@playwright/test';

export class BoardManager {
  private readonly _page: Page;

  constructor(readonly locator: Locator) {
    this._page = locator.page();
  }

  columns(): Locator {
    return this.locator.getByTestId('board-column');
  }

  column(index: number): ColumnManager {
    return new ColumnManager(this.locator.getByTestId('board-column').nth(index));
  }
}

export class ColumnManager {
  private readonly _page: Page;

  constructor(readonly locator: Locator) {
    this._page = locator.page();
  }

  items(): Locator {
    return this.locator.getByTestId('board-item');
  }

  item(index: number): ItemManager {
    return new ItemManager(this.locator.getByTestId('board-item').nth(index));
  }

  async addItem(): Promise<void> {
    await this.locator.getByTestId('board-column-add-item').click();
  }

  header(): Locator {
    return this.locator.getByTestId('board-column-header');
  }

  title(): Locator {
    return this.header().getByRole('heading');
  }

  async dragTo(target: Locator, offset = { x: 0, y: 0 }): Promise<void> {
    const handle = this.header().getByTestId('card-drag-handle');
    const handleBox = await handle.boundingBox();
    if (!handleBox) {
      return;
    }

    await handle.hover();
    await this._page.mouse.down();
    // Small initial movement to trigger the native drag start.
    await this._page.mouse.move(handleBox.x + handleBox.width / 2 + 1, handleBox.y + handleBox.height / 2, {
      steps: 1,
    });
    // Allow the drag monitor to register and the DOM to settle
    // (the dragged column is removed from visible items, shifting remaining columns).
    await this._page.waitForTimeout(200);
    const box = await target.boundingBox();
    if (box) {
      await this._page.mouse.move(offset.x + box.x + box.width / 2, offset.y + box.y + box.height / 2, { steps: 4 });
      // Allow the drop target to process the hover before releasing.
      await this._page.waitForTimeout(100);
      await this._page.mouse.up();
    }
  }
}

export class ItemManager {
  private readonly _page: Page;

  constructor(readonly locator: Locator) {
    this._page = locator.page();
  }

  title(): Locator {
    return this.locator.getByRole('heading').first();
  }

  async dragTo(target: Locator, offset = { x: 0, y: 0 }): Promise<void> {
    const handle = this.locator.getByTestId('card-drag-handle');
    const box = await target.boundingBox();
    if (box) {
      await handle.hover();
      await this._page.mouse.down();
      // Allow the drag monitor to register the grab before moving.
      await this._page.waitForTimeout(100);
      await this._page.mouse.move(offset.x + box.x + box.width / 2, offset.y + box.y + box.height / 2, { steps: 4 });
      // Allow the drop target to process the hover before releasing.
      await this._page.waitForTimeout(100);
      await this._page.mouse.up();
    }
  }

  /**
   * Drag this item to a column's scroll bottom, hold to trigger auto-scroll,
   * then wait for the drop target to become visible and drop on it.
   *
   * @param holdTarget - The footer element; mouse is held ~20px above it to trigger auto-scroll.
   * @param dropTarget - The element to drop on once it scrolls into view.
   * @param dropOffset - Offset from the drop target center.
   */
  async dragToEndWithAutoScroll(holdTarget: Locator, dropTarget: Locator, dropOffset = { x: 0, y: 0 }): Promise<void> {
    const handle = this.locator.getByTestId('card-drag-handle');
    const holdBox = await holdTarget.boundingBox();
    if (!holdBox) {
      return;
    }

    // The hold position is ~20px above the footer to trigger pragmatic auto-scroll.
    const holdX = holdBox.x + holdBox.width / 2;
    const holdY = holdBox.y - 20;

    await handle.hover();
    await this._page.mouse.down();
    // Allow the drag monitor to register the grab before moving.
    await this._page.waitForTimeout(100);

    // Move to hold position above the footer to trigger auto-scroll.
    await this._page.mouse.move(holdX, holdY, { steps: 4 });

    // Hold and nudge mouse periodically to keep auto-scroll active until drop target is visible.
    for (let i = 0; i < 40; i++) {
      // Wait between nudges to give auto-scroll time to advance.
      await this._page.waitForTimeout(200);
      // Small nudge to keep drag events firing (auto-scroll stalls without movement).
      await this._page.mouse.move(holdX + (i % 2), holdY, { steps: 1 });

      const dropBox = await dropTarget.boundingBox();
      if (dropBox && dropBox.y + dropBox.height < holdY) {
        // Drop target has scrolled into view, move to it and drop.
        await this._page.mouse.move(
          dropOffset.x + dropBox.x + dropBox.width / 2,
          dropOffset.y + dropBox.y + dropBox.height / 2,
          { steps: 4 },
        );
        // Allow the drop target to process the hover before releasing.
        await this._page.waitForTimeout(100);
        await this._page.mouse.up();
        return;
      }
    }

    // Fallback: drop wherever we are.
    await this._page.mouse.up();
  }
}
