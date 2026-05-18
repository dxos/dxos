//
// Copyright 2026 DXOS.org
//

import type { Cell, CellCoord, Headers, Viewport } from './types';

export const cellKey = (col: number, row: number): string => `${col},${row}`;

export const cellWidth = (viewport: Viewport): number => viewport.baseCellWidth * viewport.zoomX;

/**
 * Convert a cell's world coordinates to screen-space pixel rectangle (relative to canvas origin).
 */
export const worldToScreen = (
  viewport: Viewport,
  headers: Headers,
  coord: { col: number; row: number; length?: number },
): { x: number; y: number; w: number; h: number } => {
  const w = cellWidth(viewport);
  return {
    x: headers.left + coord.col * w - viewport.scrollX,
    y: headers.top + coord.row * viewport.cellHeight - viewport.scrollY,
    w: (coord.length ?? 1) * w,
    h: viewport.cellHeight,
  };
};

/**
 * Convert screen-space pixels (relative to canvas origin) to fractional cell coordinates.
 */
export const screenToWorld = (
  viewport: Viewport,
  headers: Headers,
  point: { x: number; y: number },
): { col: number; row: number } => {
  const w = cellWidth(viewport);
  return {
    col: (point.x - headers.left + viewport.scrollX) / w,
    row: (point.y - headers.top + viewport.scrollY) / viewport.cellHeight,
  };
};

export const hitTestCell = (
  viewport: Viewport,
  headers: Headers,
  point: { x: number; y: number },
): CellCoord | null => {
  if (point.x < headers.left || point.y < headers.top) {
    return null;
  }
  const { col, row } = screenToWorld(viewport, headers, point);
  if (col < 0 || row < 0) {
    return null;
  }
  return { col: Math.floor(col), row: Math.floor(row) };
};

/**
 * Compute the inclusive range of cell coordinates intersecting the visible content rect.
 */
export const visibleCellRange = (
  viewport: Viewport,
  headers: Headers,
  size: { width: number; height: number },
): { minCol: number; maxCol: number; minRow: number; maxRow: number } => {
  const w = cellWidth(viewport);
  const innerW = Math.max(0, size.width - headers.left);
  const innerH = Math.max(0, size.height - headers.top);
  const minCol = Math.max(0, Math.floor(viewport.scrollX / w));
  const maxCol = Math.floor((viewport.scrollX + innerW) / w);
  const minRow = Math.max(0, Math.floor(viewport.scrollY / viewport.cellHeight));
  const maxRow = Math.floor((viewport.scrollY + innerH) / viewport.cellHeight);
  return { minCol, maxCol, minRow, maxRow };
};

/**
 * Iterate sparse cell map, yielding only cells whose horizontal extent intersects visible cols and whose row is visible.
 */
export const visibleCells = function* <T>(
  cells: ReadonlyMap<string, Cell<T>>,
  range: { minCol: number; maxCol: number; minRow: number; maxRow: number },
): Generator<Cell<T>> {
  for (const cell of cells.values()) {
    if (cell.row < range.minRow || cell.row > range.maxRow) {
      continue;
    }
    const start = cell.col;
    const end = cell.col + cell.length - 1;
    if (end < range.minCol || start > range.maxCol) {
      continue;
    }
    yield cell;
  }
};
