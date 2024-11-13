//
// Copyright 2024 DXOS.org
//

import {
  type DxGridCellIndex,
  type DxGridPosition,
  type DxGridPointer,
  type DxGridSelectionProps,
  type DxGridPositionNullable,
  type DxGridPlane,
  type DxGridFrozenRowsPlane,
  type DxGridFrozenColsPlane,
  type DxGridFrozenPlane,
  type DxGridAxis,
} from './types';

/**
 * Separator for serializing cell position vectors
 */
export const separator = ',';

export const toCellIndex = (cellCoords: DxGridPosition): DxGridCellIndex =>
  `${cellCoords.col}${separator}${cellCoords.row}`;

//
// A1 notation is the fallback for numbering columns and rows.
//

export const colToA1Notation = (col: number): string => {
  return (
    (col >= 26 ? String.fromCharCode('A'.charCodeAt(0) + Math.floor(col / 26) - 1) : '') +
    String.fromCharCode('A'.charCodeAt(0) + (col % 26))
  );
};

export const rowToA1Notation = (row: number): string => {
  return `${row + 1}`;
};

/**
 * The size in pixels of the gap between cells
 */
export const gap = 1;

/**
 * ResizeObserver notices even subpixel changes, only respond to changes of at least 1px.
 */
export const resizeTolerance = 1;

/**
 * The amount of pixels the primary pointer has to move after PointerDown to engage in selection.
 */
export const selectTolerance = 4;

//
// `defaultSize`, the final fallbacks
//
export const defaultSizeRow = 32;
export const defaultSizeCol = 180;

//
// `size`, when suffixed with ‘row’ or ‘col’, are limits on size applied when resizing
//
export const sizeColMin = 32;
export const sizeColMax = 1024;
export const sizeRowMin = 32;
export const sizeRowMax = 1024;

export const shouldSelect = (pointer: DxGridPointer, { pageX, pageY }: PointerEvent) => {
  if (pointer?.state === 'maybeSelecting') {
    return Math.hypot(Math.abs(pointer.pageX - pageX), Math.abs(pointer.pageY - pageY)) >= selectTolerance;
  } else {
    return false;
  }
};

export const selectionProps = (selectionStart: DxGridPosition, selectionEnd: DxGridPosition): DxGridSelectionProps => {
  const colMin = Math.min(selectionStart.col, selectionEnd.col);
  const colMax = Math.max(selectionStart.col, selectionEnd.col);
  const rowMin = Math.min(selectionStart.row, selectionEnd.row);
  const rowMax = Math.max(selectionStart.row, selectionEnd.row);
  const plane = selectionStart.plane;
  const visible = colMin !== colMax || rowMin !== rowMax;
  return { colMin, colMax, rowMin, rowMax, plane, visible };
};

export const cellSelected = (
  col: number,
  row: number,
  plane: DxGridPlane,
  selection: DxGridSelectionProps,
): boolean => {
  return (
    plane === selection.plane &&
    col >= selection.colMin &&
    col <= selection.colMax &&
    row >= selection.rowMin &&
    row <= selection.rowMax
  );
};

export const closestAction = (target: EventTarget | null): { action: string | null; actionEl: HTMLElement | null } => {
  const actionEl: HTMLElement | null = (target as HTMLElement | null)?.closest('[data-dx-grid-action]') ?? null;
  return { actionEl, action: actionEl?.getAttribute('data-dx-grid-action') ?? null };
};

export const closestCell = (target: EventTarget | null, actionEl?: HTMLElement | null): DxGridPositionNullable => {
  let cellElement = actionEl;
  if (!cellElement) {
    const { action, actionEl } = closestAction(target);
    if (action === 'cell') {
      cellElement = actionEl as HTMLElement;
    }
  }
  if (cellElement) {
    const col = parseInt(cellElement.getAttribute('aria-colindex') ?? 'never');
    const row = parseInt(cellElement.getAttribute('aria-rowindex') ?? 'never');
    const plane = (cellElement.closest('[data-dx-grid-plane]')?.getAttribute('data-dx-grid-plane') ??
      'grid') as DxGridPlane;
    return { plane, col, row };
  } else {
    return null;
  }
};

export const targetIsPlane = (target: EventTarget | null): DxGridPlane | null => {
  return ((target as HTMLElement | null)?.getAttribute('data-dx-grid-plane') as DxGridPlane | undefined | null) ?? null;
};

export const resolveRowPlane = (plane: DxGridPlane): 'grid' | DxGridFrozenRowsPlane => {
  switch (plane) {
    case 'fixedStartStart':
    case 'fixedStartEnd':
    case 'frozenRowsStart':
      return 'frozenRowsStart';
    case 'fixedEndStart':
    case 'fixedEndEnd':
    case 'frozenRowsEnd':
      return 'frozenRowsEnd';
    default:
      return 'grid';
  }
};

export const resolveColPlane = (plane: DxGridPlane): 'grid' | DxGridFrozenColsPlane => {
  switch (plane) {
    case 'fixedStartStart':
    case 'fixedEndStart':
    case 'frozenColsStart':
      return 'frozenColsStart';
    case 'fixedStartEnd':
    case 'fixedEndEnd':
    case 'frozenColsEnd':
      return 'frozenColsEnd';
    default:
      return 'grid';
  }
};

export const resolveFrozenPlane = (axis: DxGridAxis, cellPlane: DxGridPlane): 'grid' | DxGridFrozenPlane => {
  switch (cellPlane) {
    case 'fixedStartStart':
      return axis === 'col' ? 'frozenColsStart' : 'frozenRowsStart';
    case 'fixedStartEnd':
      return axis === 'col' ? 'frozenColsEnd' : 'frozenRowsStart';
    case 'fixedEndStart':
      return axis === 'col' ? 'frozenColsStart' : 'frozenRowsEnd';
    case 'fixedEndEnd':
      return axis === 'col' ? 'frozenColsEnd' : 'frozenRowsEnd';
    case 'frozenColsStart':
    case 'frozenColsEnd':
      return axis === 'col' ? cellPlane : 'grid';
    case 'frozenRowsStart':
    case 'frozenRowsEnd':
      return axis === 'row' ? cellPlane : 'grid';
    default:
      return cellPlane;
  }
};

export const isSameCell = (a: DxGridPositionNullable, b: DxGridPositionNullable) =>
  a &&
  b &&
  a.plane === b.plane &&
  Number.isFinite(a.col) &&
  Number.isFinite(a.row) &&
  a.col === b.col &&
  a.row === b.row;
