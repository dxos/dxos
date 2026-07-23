//
// Copyright 2026 DXOS.org
//

export type Rect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

/** Cell size in px (or any consistent unit, matching whatever unit `gap` is expressed in). */
export type GridCellSize = { width: number; height: number };

/**
 * Pixel rect for a grid cell/item given its integer cell coordinates and size. Unlike Board (which
 * centers cell (0,0)), Grid coordinates are 0-indexed with a top-left origin. A leading `gap` is
 * included before the first cell so the gutter is symmetric on all four edges (matching the trailing
 * `gap` in {@link gridBounds}); without it the grid hugs the top-left but has a margin bottom-right.
 */
export const cellRect = (
  { x, y, w, h }: { x: number; y: number; w: number; h: number },
  cellSize: GridCellSize,
  gap: number,
): Rect => ({
  left: gap + x * (cellSize.width + gap),
  top: gap + y * (cellSize.height + gap),
  width: w * cellSize.width + Math.max(0, w - 1) * gap,
  height: h * cellSize.height + Math.max(0, h - 1) * gap,
});

/**
 * Overall pixel size of a grid with the given column/row count.
 */
export const gridBounds = (
  columns: number,
  rows: number,
  cellSize: GridCellSize,
  gap: number,
): { width: number; height: number } => ({
  width: columns * (cellSize.width + gap) + gap,
  height: rows * (cellSize.height + gap) + gap,
});

type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export type Scroll = { left: number; top: number };

/**
 * The board's top-left offset (px) within the scroll content. Under overscroll it is half the
 * viewport (so any cell can reach the centre); otherwise it is the margin that centres a board
 * smaller than the viewport, and 0 once the scaled board overflows. Board.Viewport applies this as
 * the board's margin, and the scroll/zoom math below assumes a content point maps to
 * `pad + point * zoom`, so all three must use this single definition to stay consistent.
 */
export const boardPad = ({
  viewport,
  board,
  zoom,
  overscroll,
}: {
  viewport: Size;
  board: Size;
  zoom: number;
  overscroll: boolean;
}): Point => ({
  x: overscroll ? viewport.width / 2 : Math.max(0, (viewport.width - board.width * zoom) / 2),
  y: overscroll ? viewport.height / 2 : Math.max(0, (viewport.height - board.height * zoom) / 2),
});

/** The unscaled content point currently at the viewport centre (inverse of {@link anchoredScroll}). */
export const viewportCenterAnchor = ({
  scroll,
  viewport,
  pad,
  zoom,
}: {
  scroll: Scroll;
  viewport: Size;
  pad: Point;
  zoom: number;
}): Point => ({
  x: (scroll.left + viewport.width / 2 - pad.x) / zoom,
  y: (scroll.top + viewport.height / 2 - pad.y) / zoom,
});

/** Scroll offset that places the unscaled content point `anchor` at the viewport centre. */
export const anchoredScroll = ({
  anchor,
  viewport,
  pad,
  zoom,
}: {
  anchor: Point;
  viewport: Size;
  pad: Point;
  zoom: number;
}): Scroll => ({
  left: pad.x + anchor.x * zoom - viewport.width / 2,
  top: pad.y + anchor.y * zoom - viewport.height / 2,
});

/** A tile position (span optional, defaulting to 1×1) as stored in a layout keyed by id. */
type Position = { x: number; y: number; w?: number; h?: number };

/**
 * Number of rows to render: the lowest occupied row edge plus a few spare rows so there's always
 * room to drag/add below the current content.
 */
export const getRowCount = (layout: { items: Record<string, Position> }, spareRows = 3): number => {
  const maxBottom = Object.values(layout.items).reduce((bottom, item) => Math.max(bottom, item.y + (item.h ?? 1)), 0);
  return maxBottom + spareRows;
};

/**
 * Number of columns to render when no explicit column bound is given: the right-most occupied edge
 * plus a couple of spare columns (used for the backdrop extent of an unbounded board).
 */
export const getColumnCount = (layout: { items: Record<string, Position> }, spareColumns = 2): number => {
  const maxRight = Object.values(layout.items).reduce((right, item) => Math.max(right, item.x + (item.w ?? 1)), 0);
  return maxRight + spareColumns;
};
