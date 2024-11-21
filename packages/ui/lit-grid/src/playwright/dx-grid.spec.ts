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

    // There are nine planes
    await expect(await grid.planes()).toHaveLength(9);

    // Each plane starts with the correct number of cells within it

    // Top planes
    await expect(await grid.cellsWithinPlane('fixedStartStart')).toHaveLength(4);
    await expect(await grid.cellsWithinPlane('frozenRowsStart')).toHaveLength(2 * nCols);
    await expect(await grid.cellsWithinPlane('fixedStartEnd')).toHaveLength(2);
    // Center planes
    await expect(await grid.cellsWithinPlane('frozenColsStart')).toHaveLength(2 * nRows);
    await expect(await grid.cellsWithinPlane('grid')).toHaveLength(nRows * nCols);
    await expect(await grid.cellsWithinPlane('frozenColsEnd')).toHaveLength(nRows);
    // Bottom planes
    await expect(await grid.cellsWithinPlane('fixedEndStart')).toHaveLength(2);
    await expect(await grid.cellsWithinPlane('frozenRowsEnd')).toHaveLength(nCols);
    await expect(await grid.cellsWithinPlane('fixedEndEnd')).toHaveLength(1);

    await page.close();
  });
});
