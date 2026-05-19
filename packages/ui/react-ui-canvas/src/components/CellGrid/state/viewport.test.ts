//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { defaultViewport } from './atoms';
import { hitTestCell, screenToWorld, visibleCellRange, visibleCells, worldToScreen } from './viewport';

const headers = { left: 80, top: 24 };

describe('viewport', () => {
  test('worldToScreen / screenToWorld round-trip', ({ expect }) => {
    const viewport = { ...defaultViewport(), scrollX: 100, scrollY: 50 };
    const { x, y } = worldToScreen(viewport, headers, { col: 5, row: 3 });
    const back = screenToWorld(viewport, headers, { x, y });
    expect(back.col).toBeCloseTo(5);
    expect(back.row).toBeCloseTo(3);
  });

  test('hitTestCell returns null in header region', ({ expect }) => {
    const viewport = defaultViewport();
    expect(hitTestCell(viewport, headers, { x: 10, y: 10 })).toBeNull();
    expect(hitTestCell(viewport, headers, { x: 200, y: 10 })).toBeNull();
    expect(hitTestCell(viewport, headers, { x: 10, y: 200 })).toBeNull();
  });

  test('hitTestCell floors fractional coords', ({ expect }) => {
    const viewport = { ...defaultViewport(), baseCellWidth: 20, cellHeight: 20 };
    const coord = hitTestCell(viewport, headers, { x: 80 + 25, y: 24 + 45 });
    expect(coord).toEqual({ col: 1, row: 2 });
  });

  test('visibleCellRange respects scroll', ({ expect }) => {
    const viewport = { ...defaultViewport(), scrollX: 240, baseCellWidth: 24, cellHeight: 24 };
    const range = visibleCellRange(viewport, headers, { width: 400, height: 200 });
    expect(range.minCol).toBe(10);
  });

  test('visibleCells filters by row and column extent', ({ expect }) => {
    const cells = new Map([
      ['0,0', { col: 0, row: 0, length: 1 }],
      ['100,0', { col: 100, row: 0, length: 1 }],
      ['5,5', { col: 5, row: 5, length: 1 }],
      ['8,1', { col: 8, row: 1, length: 10 }],
    ]);
    const result = Array.from(visibleCells(cells, { minCol: 0, maxCol: 12, minRow: 0, maxRow: 2 }));
    expect(result.map((cell) => `${cell.col},${cell.row}`).sort()).toEqual(['0,0', '8,1']);
  });
});
