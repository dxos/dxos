//
// Copyright 2024 DXOS.org
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

  async waitUntilReady(): Promise<void> {
    await this.columns().first().waitFor({ state: 'visible' });
    await this.columns().nth(2).waitFor({ state: 'visible' });
    await this.column(1).items().first().waitFor({ state: 'visible' });
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
    const box = await target.boundingBox();
    if (box) {
      await handle.hover();
      await this._page.mouse.down();
      await this._page.waitForTimeout(100);
      await this._page.mouse.move(offset.x + box.x + box.width / 2, offset.y + box.y + box.height / 2, { steps: 4 });
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
    await handle.scrollIntoViewIfNeeded();
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (box) {
      await handle.hover();
      await this._page.mouse.down();
      // Allow the drag monitor to register the grab before moving.
      await this._page.waitForTimeout(100);
      await this._page.mouse.move(offset.x + box.x + box.width / 2, offset.y + box.y + box.height / 2, { steps: 8 });
      // Allow the drop target to process the hover before releasing.
      await this._page.waitForTimeout(150);
      await this._page.mouse.up();
    }
  }
}
