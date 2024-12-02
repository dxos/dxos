//
// Copyright 2024 DXOS.org
//

import { type Locator, type Page } from '@playwright/test';

import { DxGridManager } from '@dxos/lit-grid/testing';
import { type DxGridPosition, type DxGridAxis } from '@dxos/react-ui-grid';

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
    return this.cellByText('Ready').waitFor({ state: 'visible' });
  }

  async fill(text: string) {
    await this.cellEditor().fill(text);
  }

  async press(key: string) {
    await this.page.keyboard.press(key);
  }

  async commit(key: string) {
    // TODO(thure): Why do we need to wait? Enter is ignored otherwise…
    await this.page.waitForTimeout(500);
    await this.press(key);
  }

  cellByText(text: string) {
    return this.grid.grid.getByText(text);
  }

  async setFocusedCellValue(text: string, commitKey: string) {
    const mode = await this.grid.mode();
    if (mode === 'browse') {
      await this.commit('Enter');
    }
    await this.fill(text);
    await this.commit(commitKey);
  }

  async selectRange(start: DxGridPosition, end: DxGridPosition) {
    const startBox = await this.grid.cell(start.col, start.row, start.plane).boundingBox();
    const endBox = await this.grid.cell(end.col, end.row, end.plane).boundingBox();
    await this.page.mouse.move(startBox!.x + startBox!.width / 2, startBox!.y + startBox!.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(endBox!.x + endBox!.width / 2, endBox!.y + endBox!.height / 2, { steps: 10 });
    await this.page.mouse.up();
  }

  async deleteAxis(axis: DxGridAxis, position: number) {
    const col = axis === 'row' ? 0 : position;
    const row = axis === 'row' ? position : 0;
    const plane = axis === 'row' ? 'frozenColsStart' : 'frozenRowsStart';
    await this.grid.cell(col, row, plane).click({ button: 'right' });
    await this.page.getByTestId(`grid.${axis}.drop`).click();
  }

  toolbarAction(key: string, value: string) {
    return this.page.getByTestId(`grid.toolbar.${key}.${value}`);
  }

  cellEditor() {
    return this.page.getByTestId('grid.cell-editor').getByRole('textbox');
  }

  rangeInList(a1Coords: string) {
    return this.page.getByTestId('grid.range-list').getByText(a1Coords);
  }
}
