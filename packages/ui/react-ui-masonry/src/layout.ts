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
  /** Total content height (px), including the perimeter gap. */
  height: number;
};

export type LayoutOptions = {
  /** Measured tile heights (px), in item order. Unmeasured tiles pass 0. */
  heights: readonly number[];
  /** Number of columns to lay out across. */
  columnCount: number;
  /** Available content width (px), already net of any scrollbar allowance. */
  containerWidth: number;
  /** Space (px) between tiles and, vertically, around the grid perimeter. */
  gapPx: number;
};

/**
 * Lay tiles out into balanced columns using column-major greedy assignment: each
 * tile is placed in the currently shortest column (ties resolve to the lowest
 * index for stable ordering). Pure and synchronous so column balancing is unit
 * testable without a DOM.
 *
 * Columns are separated by a single gap and stretch to fill `containerWidth`
 * (`maxColumnWidth` is applied upstream by choosing the column count, not by
 * capping width here, so left/right spacing stays equal to the gap). The
 * left/right perimeter is owned by the scroll container (via its `--gutter`); the
 * layout only adds the top and bottom perimeter so vertical spacing matches too.
 */
export const layout = ({ heights, columnCount, containerWidth, gapPx }: LayoutOptions): LayoutResult => {
  const columns = Math.max(1, Math.floor(columnCount));
  const columnWidth = (containerWidth - (columns - 1) * gapPx) / columns;

  // Seed each column with the top gap so the first row clears the perimeter.
  const columnHeights = new Array<number>(columns).fill(gapPx);

  const rects: Rect[] = heights.map((tileHeight) => {
    let target = 0;
    for (let column = 1; column < columns; ++column) {
      if (columnHeights[column] < columnHeights[target]) {
        target = column;
      }
    }

    const rect: Rect = {
      x: target * (columnWidth + gapPx),
      y: columnHeights[target],
      column: target,
    };
    columnHeights[target] += tileHeight + gapPx;
    return rect;
  });

  // Each column already carries a trailing gap, which becomes the bottom perimeter.
  const tallest = columnHeights.reduce((max, value) => Math.max(max, value), 0);
  const height = heights.length === 0 ? 0 : tallest;
  return { rects, columnWidth, height };
};
