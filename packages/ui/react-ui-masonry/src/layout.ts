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
  /** Optional cap on column width (px); leftover width centers the columns. */
  maxColumnWidthPx?: number;
  /** Centre capped columns in the container. Off aligns them to the start, leaving the slack at the end. */
  centered?: boolean;
};

/**
 * Lay tiles out into balanced columns using column-major greedy assignment: each
 * tile is placed in the currently shortest column (ties resolve to the lowest
 * index for stable ordering). Pure and synchronous so column balancing is unit
 * testable without a DOM.
 *
 * Columns are separated by a single gap. They stretch to fill `containerWidth`
 * unless `maxColumnWidthPx` caps them narrower, in which case the leftover width
 * is split evenly so the grid stays centred (the outer margin grows beyond the
 * gap) — or, with `centered` off, left entirely at the end so the columns align to
 * the start. The base left/right perimeter is owned by the scroll container (via
 * its `--gutter`); the layout adds any centring offset plus the top/bottom perimeter.
 */
/**
 * Width every column gets, before any tile is placed. Independent of the tiles themselves — which is
 * what lets a caller key cached tile heights by the width they were measured at.
 */
export const getColumnWidth = ({
  columnCount,
  containerWidth,
  gapPx,
  maxColumnWidthPx,
}: Pick<LayoutOptions, 'columnCount' | 'containerWidth' | 'gapPx' | 'maxColumnWidthPx'>): number => {
  const columns = Math.max(1, Math.floor(columnCount));
  const fillColumnWidth = (containerWidth - (columns - 1) * gapPx) / columns;
  return maxColumnWidthPx && maxColumnWidthPx > 0 ? Math.min(fillColumnWidth, maxColumnWidthPx) : fillColumnWidth;
};

export const layout = ({
  heights,
  columnCount,
  containerWidth,
  gapPx,
  maxColumnWidthPx,
  centered = true,
}: LayoutOptions): LayoutResult => {
  const columns = Math.max(1, Math.floor(columnCount));
  const columnWidth = getColumnWidth({ columnCount, containerWidth, gapPx, maxColumnWidthPx });

  // Centre the (possibly capped) columns within the container, unless start-aligned.
  const usedWidth = columns * columnWidth + (columns - 1) * gapPx;
  const sideInset = centered ? Math.max(0, (containerWidth - usedWidth) / 2) : 0;

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
      x: sideInset + target * (columnWidth + gapPx),
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
