//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { layout } from './layout';

describe('layout', () => {
  test('assigns each tile to the shortest column (not by index)', ({ expect }) => {
    // With index-based placement item 2 would land in column 0; balancing puts it
    // in column 1 because column 0 is still occupied by the tall first tile.
    const { rects } = layout({ heights: [100, 10, 10, 10], columnCount: 2, containerWidth: 200, gapPx: 0 });
    expect(rects.map((rect) => rect.column)).toEqual([0, 1, 1, 1]);
  });

  test('breaks ties toward the lowest column index', ({ expect }) => {
    const { rects } = layout({ heights: [10, 10], columnCount: 2, containerWidth: 200, gapPx: 0 });
    expect(rects.map((rect) => rect.column)).toEqual([0, 1]);
  });

  test('computes column width and offsets accounting for the perimeter gap', ({ expect }) => {
    const { rects, columnWidth } = layout({ heights: [10, 10], columnCount: 2, containerWidth: 100, gapPx: 10 });
    expect(columnWidth).toBe(35); // (100 - 3 * 10) / 2
    expect(rects[0]).toMatchObject({ x: 10, y: 10, column: 0 }); // leading gap on both axes
    expect(rects[1]).toMatchObject({ x: 55, y: 10, column: 1 }); // 10 + 1 * (35 + 10)
  });

  test('stacks vertically in a single column with perimeter gaps', ({ expect }) => {
    const { rects, height } = layout({ heights: [30, 20], columnCount: 1, containerWidth: 100, gapPx: 10 });
    expect(rects.map((rect) => rect.y)).toEqual([10, 50]); // 10 gap, then 10 + 30 + 10
    expect(height).toBe(80); // 10 + 30 + 10 + 20 + 10
  });

  test('handles an empty input', ({ expect }) => {
    const { rects, height } = layout({ heights: [], columnCount: 3, containerWidth: 300, gapPx: 8 });
    expect(rects).toEqual([]);
    expect(height).toBe(0);
  });

  test('clamps a non-positive column count to one', ({ expect }) => {
    const { rects } = layout({ heights: [10, 10], columnCount: 0, containerWidth: 100, gapPx: 0 });
    expect(rects.map((rect) => rect.column)).toEqual([0, 0]);
  });
});
