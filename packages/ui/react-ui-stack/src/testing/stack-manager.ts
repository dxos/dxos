//
// Copyright 2023 DXOS.org
//

import type { Locator, Page } from '@playwright/test';

export class StackManager {
  private readonly _page: Page;

  constructor(readonly locator: Locator) {
    this._page = locator.page();
  }

  isEmpty() {
    return this.locator.getByTestId('stack.empty').isVisible();
  }

  length() {
    return this.locator.locator('li').count();
  }

  order() {
    return this.locator.locator('li').evaluateAll((els) => els.map((el) => el.getAttribute('id')));
  }

  section(index: number) {
    return new SectionManager(this.locator.locator('li').nth(index));
  }
}

export class SectionManager {
  private readonly _page: Page;

  constructor(readonly locator: Locator) {
    this._page = locator.page();
  }

  async id() {
    return this.locator.getAttribute('id');
  }

  async remove() {
    await this.locator.getByTestId('section.drag-handle-menu-trigger').click();
    await this._page.getByTestId('section.remove').click();
  }

  async navigateTo() {
    await this.locator.getByTestId('section.drag-handle-menu-trigger').click();
    await this._page.getByTestId('section.navigate-to').click();
  }

  async dragTo(target: Locator) {
    await this.locator.getByTestId('section.drag-handle-menu-trigger').hover();
    await this._page.mouse.down();
    // Trigger dndkit drag sensor start.
    await this._page.mouse.move(0, 0);
    await target.hover();
    await this._page.mouse.up();
  }
}
