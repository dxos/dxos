//
// Copyright 2021 DXOS.org
//

import { expect, test, type Browser, type Page, type Locator } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { type DxGridCellsSelect, type DxGridPlanePosition } from '../types';
import { toPlaneCellIndex } from '../util';

const gridPlaneCellSize = 31;
const gap = 1;
const nCols = 9;
const nRows = 7;

class GridManager {
  constructor(browser: Browser) {
    this.browser = browser;
    this.page = null;
  }

  page: Page | null;
  browser: Browser;

  async open() {
    const { page } = await setupPage(this.browser, {
      url: storybookUrl('dx-grid--spec'),
      viewportSize: {
        width: (gridPlaneCellSize + gap) * (nCols + 1.5),
        height: (gridPlaneCellSize + gap) * (nRows + 1.5),
      }, // 336 x 272
    });
    this.page = page;
    return this.page.locator('.dx-grid').waitFor({ state: 'visible' });
  }

  close() {
    return this.page?.close();
  }

  planes() {
    return this.page!.locator('.dx-grid [data-dx-grid-plane]').all();
  }

  cellsWithinPlane(plane: string) {
    return this.page!.locator(`.dx-grid [data-dx-grid-plane="${plane}"]`).getByRole('gridcell').all();
  }

  cell(col: number, row: number, plane: string) {
    return this.page!.locator(
      `.dx-grid [data-dx-grid-plane="${plane}"] [aria-colindex="${col}"][aria-rowindex="${row}"]`,
    );
  }

  panByWheel(deltaX: number, deltaY: number) {
    return this.page!.locator('.dx-grid [data-dx-grid-plane="grid"]').dispatchEvent('wheel', { deltaX, deltaY });
  }

  async forCellsInRange(
    start: DxGridPlanePosition,
    end: DxGridPlanePosition,
    iterator: (col: number, row: number) => Promise<void>,
  ) {
    const nCols = 1 + end.col - start.col;
    const nRows = 1 + end.row - start.row;

    await Promise.all(
      [...Array(nCols)].map(async (_, c0) => {
        return Promise.all(
          [...Array(nRows)].map(async (_, r0) => {
            return iterator(start.col + c0, start.row + r0);
          }),
        );
      }),
    );
  }

  async expectSelectionResult(start: DxGridPlanePosition, end: DxGridPlanePosition) {
    return this.forCellsInRange(start, end, (col, row) =>
      expect(this.cell(col, row, 'grid')).toHaveAttribute('aria-selected', 'true'),
    );
  }

  async expectVirtualizationResult(cols: number, rows: number, minColIndex = 0, minRowIndex = 0) {
    await this.cell(minColIndex, minRowIndex, 'grid').waitFor({ state: 'visible' });
    // Top planes
    await expect(await this.cellsWithinPlane('fixedStartStart')).toHaveLength(4);
    await expect(await this.cellsWithinPlane('frozenRowsStart')).toHaveLength(2 * cols);
    await expect(await this.cellsWithinPlane('fixedStartEnd')).toHaveLength(2);
    // Center planes
    await expect(await this.cellsWithinPlane('frozenColsStart')).toHaveLength(2 * rows);
    await expect(await this.cellsWithinPlane('grid')).toHaveLength(rows * cols);
    await expect(await this.cellsWithinPlane('frozenColsEnd')).toHaveLength(rows);
    // Bottom planes
    await expect(await this.cellsWithinPlane('fixedEndStart')).toHaveLength(2);
    await expect(await this.cellsWithinPlane('frozenRowsEnd')).toHaveLength(cols);
    await expect(await this.cellsWithinPlane('fixedEndEnd')).toHaveLength(1);
  }

  async expectFocus(locator: Locator) {
    return expect(await locator.evaluate((node) => document.activeElement === node)).toBeTruthy();
  }

  listenForSelect() {
    return this.page!.evaluate(() => {
      document.querySelector('dx-grid')!.addEventListener('dx-grid-cells-select', (event) => {
        (window as any).DX_GRID_EVENT = event;
      });
    });
  }

  async waitForDxEvent<E>(): Promise<E> {
    const event = await this.page!.waitForFunction(() => {
      return (window as any).DX_GRID_EVENT;
    });
    await this.page!.evaluate(() => {
      return ((window as any).DX_GRID_EVENT = undefined);
    });
    return event.jsonValue();
  }
}

test.describe('dx-grid', () => {
  test('virtualization & panning', async ({ browser }) => {
    const grid = new GridManager(browser);
    await grid.open();

    // There are nine planes in the spec story.
    await expect(await grid.planes()).toHaveLength(9);

    // Each plane starts with the correct number of cells within it on initial render.
    await grid.expectVirtualizationResult(nCols, nRows);

    // Now pan by wheel to the center point of the cell one right and one down from the origin cell of the grid plane.
    await grid.panByWheel(gridPlaneCellSize * 1.5 + gap, gridPlaneCellSize * 1.5 + gap);

    // Confirm that the grid plane is showing only the cells that would be visible.
    await grid.expectVirtualizationResult(nCols + 1, nRows + 1, 1, 1);

    // Done.
    await grid.close();
  });
  test('mouse access', async ({ browser }) => {
    const grid = new GridManager(browser);
    await grid.open();

    await grid.listenForSelect();

    // Find and click on the cell at 0,0.
    const cell00 = await grid.cell(0, 0, 'grid');
    await cell00.click();

    // It should now have focus
    await grid.expectFocus(cell00);

    // Shift-click on the cell at 1,1 and wait for the selection change custom event.
    await grid.cell(1, 1, 'grid').click({ modifiers: ['Shift'] });
    const select = await grid.waitForDxEvent<DxGridCellsSelect>();

    // Expect the event to have the right information.
    expect(select).toHaveProperty('start', toPlaneCellIndex({ col: 0, row: 0 }));
    expect(select).toHaveProperty('end', toPlaneCellIndex({ col: 1, row: 1 }));

    // The cell at 0,0 should still have focus despite the shift+click.
    await grid.expectFocus(cell00);

    // All the cells between 0,0 and 1,1 must have `aria-selected=true`.
    await grid.expectSelectionResult({ col: 0, row: 0 }, { col: 1, row: 1 });

    // Clicking on another cell should move focus and change selection to match that one cell.
    const cell22 = await grid.cell(2, 2, 'grid');
    await cell22.click();
    const finalSelect = await grid.waitForDxEvent<DxGridCellsSelect>();

    expect(finalSelect).toHaveProperty('start', toPlaneCellIndex({ col: 2, row: 2 }));
    expect(finalSelect).toHaveProperty('end', toPlaneCellIndex({ col: 2, row: 2 }));

    await grid.expectFocus(cell22);

    await grid.expectSelectionResult({ col: 2, row: 2 }, { col: 2, row: 2 });

    // Done
    await grid.close();
  });
  test('keyboard access', async ({ browser }) => {
    const grid = new GridManager(browser);
    await grid.open();

    // Tabbing to the first plane and enter to the first cell there.
    await grid.page!.keyboard.press('Tab');
    await grid.page!.keyboard.press('Enter');
    await grid.expectFocus(grid.cell(0, 0, 'fixedStartStart'));

    // Escape to the planes and arrow over to the grid plane, then enter to the first cell there.
    await grid.page!.keyboard.press('Escape');
    await grid.page!.keyboard.press('ArrowRight');
    await grid.page!.keyboard.press('ArrowDown');
    await grid.page!.keyboard.press('Enter');
    await grid.expectFocus(grid.cell(0, 0, 'grid'));

    // Select a range by holding shift.
    await grid.page!.keyboard.down('Shift');
    await grid.page!.keyboard.press('ArrowRight');
    await grid.page!.keyboard.press('ArrowRight');
    await grid.page!.keyboard.press('ArrowDown');
    await grid.page!.keyboard.press('ArrowDown');
    await grid.page!.keyboard.up('Shift');
    await grid.expectFocus(grid.cell(0, 0, 'grid'));
    await grid.expectSelectionResult({ col: 0, row: 0 }, { col: 2, row: 2 });

    // Arrowing from there cancels selection.
    await grid.page!.keyboard.press('ArrowRight');
    await grid.page!.keyboard.press('ArrowDown');
    await grid.expectFocus(grid.cell(1, 1, 'grid'));
  });
});
