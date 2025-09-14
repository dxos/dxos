//
// Copyright 2024 DXOS.org
//

import { type Locator, type Page } from '@playwright/test';

import { DxGridManager } from '@dxos/lit-grid/testing';
import { type DxGridAxis, type DxGridPosition } from '@dxos/react-ui-grid';

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

  async fill(text: string): Promise<void> {
    // TODO(thure): Do these timeouts help with test flakiness?
    await this.page.waitForTimeout(200);
    await this.cellEditor().fill(text);
    await this.page.waitForTimeout(200);
  }

  async press(key: string): Promise<void> {
    // TODO(thure): Does these timeouts help with test flakiness?
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press(key);
    await this.page.waitForTimeout(200);
  }

  async commit(key: string): Promise<void> {
    // TODO(thure): Why do we need to wait? Enter is ignored otherwise…
    await this.page.waitForTimeout(500);
    await this.press(key);
  }

  cellByText(text: string) {
    return this.grid.grid.getByText(text);
  }

  async setFocusedCellValue(text: string, commitKey: string): Promise<void> {
    const mode = await this.grid.mode();
    if (mode === 'browse') {
      await this.commit('Enter');
    }
    await this.fill(text);
    await this.commit(commitKey);
  }

  async selectRange(start: DxGridPosition, end: DxGridPosition): Promise<void> {
    const startCell = this.grid.cell(start.col, start.row, start.plane);
    const endCell = this.grid.cell(end.col, end.row, end.plane);
    const startBox = await startCell.boundingBox();
    const endBox = await endCell.boundingBox();
    await startCell.dragTo(endCell, {
      sourcePosition: { x: startBox!.width / 2, y: startBox!.height / 2 },
      targetPosition: { x: endBox!.width / 2, y: endBox!.height / 2 },
    });
  }

  async deleteAxis(axis: DxGridAxis, position: number): Promise<void> {
    const col = axis === 'row' ? 0 : position;
    const row = axis === 'row' ? position : 0;
    const plane = axis === 'row' ? 'frozenColsStart' : 'frozenRowsStart';
    await this.grid.cell(col, row, plane).click({ button: 'right' });
    await this.page.getByTestId(`grid.${axis}.drop`).click();
  }

  toolbarAction(key: string, value: string): Locator {
    return this.page.getByTestId(`grid.toolbar.${key}.${value}`);
  }

  cellEditor(): Locator {
    return this.page.getByTestId('grid.cell-editor').getByRole('textbox');
  }

  rangeInList(a1Coords: string): Locator {
    return this.page.getByTestId('grid.range-list').getByText(a1Coords);
  }
}
