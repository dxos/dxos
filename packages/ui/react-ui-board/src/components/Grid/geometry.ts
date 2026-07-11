//
// Copyright 2026 DXOS.org
//

export type Rect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

/** Cell size in px (or any consistent unit, matching whatever unit `gap` is expressed in). */
export type GridCellSize = { width: number; height: number };

/**
 * Pixel rect for a grid cell/item given its integer cell coordinates and size. Unlike Board (which
 * centers cell (0,0)), Grid coordinates are 0-indexed with a top-left origin, so the rect's origin
 * is a simple multiple of the cell pitch.
 */
export const cellRect = (
  { x, y, w, h }: { x: number; y: number; w: number; h: number },
  cellSize: GridCellSize,
  gap: number,
): Rect => ({
  left: x * (cellSize.width + gap),
  top: y * (cellSize.height + gap),
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

/**
 * Number of rows to render: the lowest occupied row edge plus a few spare rows so there's always
 * room to drag/add below the current content.
 */
export const getRowCount = (layout: { items: readonly { y: number; h: number }[] }, spareRows = 3): number => {
  const maxBottom = layout.items.reduce((bottom, item) => Math.max(bottom, item.y + item.h), 0);
  return maxBottom + spareRows;
};
