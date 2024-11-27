//
// Copyright 2024 DXOS.org
//

import { type Locator, type Page } from '@playwright/test';

import { DxGridManager } from '@dxos/lit-grid/testing';

/**
 * Test helper for managing dx-grid interactions and assertions in Playwright tests.
 * Provides utilities for cell selection, grid navigation, virtualization checks and event handling.
 */
export class SheetManager {
  constructor(page: Page, grid?: Locator) {
    this.grid = new DxGridManager(page, grid);
    this.page = page;
  }

  grid: DxGridManager;
  page: Page;

  async ready() {
    await this.grid.ready();
    return this.cellByText('Total').waitFor({ state: 'visible' });
  }

  cellByText(text: string) {
    return this.grid.grid.getByText(text);
  }

  cellEditor() {
    return this.page.getByTestId('grid.cell-editor');
  }
}
