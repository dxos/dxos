//
// Copyright 2024 DXOS.org
//

import { type Locator, type Page, expect } from '@playwright/test';

import type { DxGridPlanePosition } from '../types';

/**
 * Test helper for managing dx-grid interactions and assertions in Playwright tests.
 * Provides utilities for cell selection, grid navigation, virtualization checks and event handling.
 */
export class DxGridManager {
  constructor(page: Page, grid: Locator = page.locator('dx-grid')) {
    this.grid = grid;
    this.page = page;
  }

  grid: Locator;
  page: Page;

  async ready(): Promise<void> {
    return this.grid.locator('.dx-grid').waitFor({ state: 'visible' });
  }

  planes(): Locator {
    return this.grid.locator('.dx-grid [data-dx-grid-plane]');
  }

  cellsWithinPlane(plane: string): Locator {
    return this.grid.locator(`.dx-grid [data-dx-grid-plane="${plane}"]`).getByRole('gridcell');
  }

  cell(col: number, row: number, plane: string): Locator {
    return this.grid.locator(
      `.dx-grid [data-dx-grid-plane="${plane}"] [aria-colindex="${col}"][aria-rowindex="${row}"]`,
    );
  }

  mode(): Promise<string | null> {
    return this.grid.locator('.dx-grid').getAttribute('data-grid-mode');
  }

  panByWheel(deltaX: number, deltaY: number): Promise<void> {
    return this.grid.locator('.dx-grid [data-dx-grid-plane="grid"]').dispatchEvent('wheel', { deltaX, deltaY });
  }

  async forCellsInRange(
    start: DxGridPlanePosition,
    end: DxGridPlanePosition,
    iterator: (col: number, row: number) => Promise<void>,
  ): Promise<void> {
    const nCols = 1 + end.col - start.col;
    const nRows = 1 + end.row - start.row;

    await Promise.all(
      [...Array(nCols)].map(async (_, c0) =>
        Promise.all([...Array(nRows)].map(async (_, r0) => iterator(start.col + c0, start.row + r0))),
      ),
    );
  }

  async expectSelectionResult(start: DxGridPlanePosition, end: DxGridPlanePosition): Promise<void> {
    return this.forCellsInRange(start, end, (col, row) =>
      expect(this.cell(col, row, 'grid')).toHaveAttribute('aria-selected', 'true'),
    );
  }

  async expectVirtualizationResult(cols: number, rows: number, minColIndex = 0, minRowIndex = 0): Promise<void> {
    await this.cell(minColIndex, minRowIndex, 'grid').waitFor({ state: 'visible' });
    // Top planes
    await expect(this.cellsWithinPlane('fixedStartStart')).toHaveCount(4);
    await expect(this.cellsWithinPlane('frozenRowsStart')).toHaveCount(2 * cols);
    await expect(this.cellsWithinPlane('fixedStartEnd')).toHaveCount(2);
    // Center planes
    await expect(this.cellsWithinPlane('frozenColsStart')).toHaveCount(2 * rows);
    await expect(this.cellsWithinPlane('grid')).toHaveCount(rows * cols);
    await expect(this.cellsWithinPlane('frozenColsEnd')).toHaveCount(rows);
    // Bottom planes
    await expect(this.cellsWithinPlane('fixedEndStart')).toHaveCount(2);
    await expect(this.cellsWithinPlane('frozenRowsEnd')).toHaveCount(cols);
    await expect(this.cellsWithinPlane('fixedEndEnd')).toHaveCount(1);
  }

  async expectFocus(locator: Locator): Promise<void> {
    return expect(await locator.evaluate((node) => document.activeElement === node)).toBeTruthy();
  }

  listenForSelect(): Promise<void> {
    return this.grid.evaluate(() => {
      document.querySelector('dx-grid')!.addEventListener('dx-grid-cells-select', (event) => {
        (window as any).DX_GRID_EVENT = event;
      });
    });
  }

  async waitForDxEvent<E>(): Promise<E> {
    const event = await this.page.waitForFunction(() => (window as any).DX_GRID_EVENT);
    await this.grid.evaluate(() => ((window as any).DX_GRID_EVENT = undefined));
    return event.jsonValue();
  }
}
