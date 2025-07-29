//
// Copyright 2023 DXOS.org
//

import type { Locator, Page } from '@playwright/test';

export class StackManager {
  private readonly _page: Page;

  constructor(readonly locator: Locator) {
    this._page = locator.page();
  }

  sections(): Locator {
    return this.locator.locator('section');
  }

  order() {
    return this.locator.locator('section').evaluateAll((els) => els.map((el) => el.getAttribute('id')));
  }

  section(index: number): SectionManager {
    return new SectionManager(this.locator.locator('section').nth(index));
  }
}

export class SectionManager {
  private readonly _page: Page;

  constructor(readonly locator: Locator) {
    this._page = locator.page();
  }

  async id(): Promise<string | null> {
    return this.locator.getAttribute('id');
  }

  async remove(): Promise<void> {
    await this.locator.getByTestId('section.drag-handle-menu-trigger').click();
    await this._page.getByTestId('section.remove').click();
  }

  async navigateTo(): Promise<void> {
    await this.locator.getByTestId('section.drag-handle-menu-trigger').click();
    await this._page.getByTestId('section.navigate-to').click();
  }

  async dragTo(target: Locator, offset: { x: number; y: number } = { x: 0, y: 0 }): Promise<void> {
    const active = this.locator.getByTestId('section.drag-handle-menu-trigger');
    const box = await target.boundingBox();
    if (box) {
      await active.hover();
      await this._page.mouse.down();
      // Timeouts are for input discretization in WebKit
      await this._page.waitForTimeout(100);
      await this._page.pause();
      await this._page.mouse.move(offset.x + box.x + box.width / 2, offset.y + box.y + box.height / 2, { steps: 4 });
      await this._page.pause();
      await this._page.waitForTimeout(100);
      await this._page.mouse.up();
    }
  }
}
