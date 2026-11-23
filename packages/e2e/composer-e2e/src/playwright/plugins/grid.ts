//
// Copyright 2026 DXOS.org
//

import { type Locator, expect } from '@playwright/test';

/** A `dx-grid` (a sheet or a table) inside `scope`, usually a plank. */
export const Grid = {
  /** A cell by its visual position in a plane. */
  cell: (scope: Locator, col: number, row: number, plane = 'grid') => scope.getByTestId(`${plane}.${col}.${row}`),
  /** Other users' selections drawn on the grid. */
  remoteSelections: (scope: Locator) => scope.getByTestId('dx-grid.remote-selection'),
  /** Asserts a remote selection's outline covers exactly the cells from `start` to `end`. */
  expectCovers: async (selection: Locator, start: Locator, end = start) => {
    await expect
      .poll(async () => {
        const [box, startBox, endBox] = await Promise.all([
          selection.boundingBox(),
          start.boundingBox(),
          end.boundingBox(),
        ]);
        if (!box || !startBox || !endBox) {
          return false;
        }

        const near = (a: number, b: number) => Math.abs(a - b) <= 2;
        return (
          near(box.x, startBox.x) &&
          near(box.y, startBox.y) &&
          near(box.x + box.width, endBox.x + endBox.width) &&
          near(box.y + box.height, endBox.y + endBox.height)
        );
      })
      .toBe(true);
  },
} as const;
