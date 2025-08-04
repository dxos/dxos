//
// Copyright 2021 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { DxGridManager } from '../testing';
import { type DxGridCellsSelect } from '../types';
import { toPlaneCellIndex } from '../util';

const gridPlaneCellSize = 31;
const gap = 1;
const nCols = 9;
const nRows = 7;

test.describe('dx-grid', () => {
  let page: Page;
  let grid: DxGridManager;

  test.beforeEach(async ({ browser }) => {
    const setup = await setupPage(browser, {
      url: storybookUrl('dx-grid--spec', 9002),
      viewportSize: {
        width: (gridPlaneCellSize + gap) * (nCols + 1.5),
        height: (gridPlaneCellSize + gap) * (nRows + 1.5),
      }, // 336 x 272
    });
    page = setup.page;
    grid = new DxGridManager(page);
    await grid.ready();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('virtualization & panning', async () => {
    // There are nine planes in the spec story.
    await expect(grid.planes()).toHaveCount(9);

    // Each plane starts with the correct number of cells within it on initial render.
    await grid.expectVirtualizationResult(nCols, nRows);

    // Now pan by wheel to the center point of the cell one right and one down from the origin cell of the grid plane.
    await grid.panByWheel(gridPlaneCellSize * 1.5 + gap, gridPlaneCellSize * 1.5 + gap);

    // Confirm that the grid plane is showing only the cells that would be visible.
    await grid.expectVirtualizationResult(nCols + 1, nRows + 1, 1, 1);
  });

  test('mouse access', async () => {
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
  });

  test('keyboard access', async () => {
    // Tabbing to the first plane and enter to the first cell there.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await grid.expectFocus(grid.cell(0, 0, 'fixedStartStart'));

    // Escape to the planes and arrow over to the grid plane, then enter to the first cell there.
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await grid.expectFocus(grid.cell(0, 0, 'grid'));

    // Select a range by holding shift.
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.up('Shift');
    await grid.expectFocus(grid.cell(0, 0, 'grid'));
    await grid.expectSelectionResult({ col: 0, row: 0 }, { col: 2, row: 2 });

    // Arrowing from there cancels selection.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await grid.expectFocus(grid.cell(1, 1, 'grid'));
  });
});
