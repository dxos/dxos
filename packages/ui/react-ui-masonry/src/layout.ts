//
// Copyright 2026 DXOS.org
//

export type Rect = {
  /** Horizontal offset (px) of the tile's left edge. */
  x: number;
  /** Vertical offset (px) of the tile's top edge. */
  y: number;
  /** Column the tile was assigned to. */
  column: number;
};

export type LayoutResult = {
  /** Position of each tile, in input order. */
  rects: Rect[];
  /** Width (px) shared by every column. */
  columnWidth: number;
  /** Total content height (px), trailing gutter trimmed. */
  height: number;
};

export type LayoutOptions = {
  /** Measured tile heights (px), in item order. Unmeasured tiles pass 0. */
  heights: readonly number[];
  /** Number of columns to lay out across. */
  columnCount: number;
  /** Available content width (px), already net of any scrollbar allowance. */
  containerWidth: number;
  /** Space (px) between columns and between stacked tiles. */
  gutterPx: number;
};

/**
 * Lay tiles out into balanced columns using column-major greedy assignment: each
 * tile is placed in the currently shortest column (ties resolve to the lowest
 * index for stable ordering). Pure and synchronous so column balancing is unit
 * testable without a DOM.
 */
export const layout = ({ heights, columnCount, containerWidth, gutterPx }: LayoutOptions): LayoutResult => {
  const columns = Math.max(1, Math.floor(columnCount));
  const columnWidth = (containerWidth - (columns - 1) * gutterPx) / columns;
  const columnHeights = new Array<number>(columns).fill(0);

  const rects: Rect[] = heights.map((tileHeight) => {
    let target = 0;
    for (let column = 1; column < columns; ++column) {
      if (columnHeights[column] < columnHeights[target]) {
        target = column;
      }
    }

    const rect: Rect = {
      x: target * (columnWidth + gutterPx),
      y: columnHeights[target],
      column: target,
    };
    columnHeights[target] += tileHeight + gutterPx;
    return rect;
  });

  const tallest = columnHeights.reduce((max, value) => Math.max(max, value), 0);
  const height = Math.max(0, tallest - gutterPx);
  return { rects, columnWidth, height };
};
