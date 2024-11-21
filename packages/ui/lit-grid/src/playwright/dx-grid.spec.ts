//
// Copyright 2021 DXOS.org
//

import { expect, test, type Page } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

const gridPlaneCellSize = 31;
const gap = 1;
const nCols = 9;
const nRows = 7;

class GridManager {
  constructor(page: Page) {
    this.page = page;
  }

  private page: Page;

  async ready() {
    return this.page.locator('.dx-grid').waitFor({ state: 'visible' });
  }

  async planes() {
    return this.page.locator('.dx-grid [data-dx-grid-plane]').all();
  }

  async cellsWithinPlane(plane: string) {
    return this.page.locator(`.dx-grid [data-dx-grid-plane="${plane}"]`).getByRole('gridcell').all();
  }

  async panByWheel(deltaX: number, deltaY: number) {
    return this.page.locator('.dx-grid [data-dx-grid-plane="grid"]').dispatchEvent('wheel', { deltaX, deltaY });
  }

  async expectVirtualizationResult(cols: number, rows: number, minColIndex = 0, minRowIndex = 0) {
    await this.page
      .locator(`.dx-grid [data-dx-grid-plane="grid"] [aria-colindex="${minColIndex}"][aria-rowindex="${minRowIndex}"]`)
      .waitFor({ state: 'visible' });
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
}

test.describe('dx-grid', () => {
  test('virtualization & panning', async ({ browser }) => {
    const { page } = await setupPage(browser, {
      url: storybookUrl('dx-grid--spec'),
      viewportSize: {
        width: (gridPlaneCellSize + gap) * (nCols + 1.5),
        height: (gridPlaneCellSize + gap) * (nRows + 1.5),
      }, // 336 x 272
    });

    const grid = new GridManager(page);
    await grid.ready();

    // There are nine planes in the spec story.
    await expect(await grid.planes()).toHaveLength(9);

    // Each plane starts with the correct number of cells within it on initial render.
    await grid.expectVirtualizationResult(nCols, nRows);

    // Now pan by wheel to the center point of the cell one right and one down from the origin cell of the grid plane.
    await grid.panByWheel(gridPlaneCellSize * 1.5 + gap, gridPlaneCellSize * 1.5 + gap);

    // Confirm that the grid plane is showing only the cells that would be visible.
    await grid.expectVirtualizationResult(nCols + 1, nRows + 1, 1, 1);

    // Done.
    await page.close();
  });
});
