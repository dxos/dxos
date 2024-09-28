//
// Copyright 2024 DXOS.org
//

import { randomBytes } from '@dxos/crypto';

import { type CellAddress, type CellRange, DEFAULT_COLUMNS, DEFAULT_ROWS, MAX_COLUMNS, MAX_ROWS } from './types';
import { type SheetSize, type SheetType } from '../types';

// TODO(burdon): Factor out from dxos/protocols to new common package.
export class ApiError extends Error {}
export class ReadonlyException extends ApiError {}
export class RangeException extends ApiError {
  constructor(n: number) {
    super();
  }
}

/**
 * With a string length of 8, the chance of a collision is 0.02% for a sheet with 10,000 strings.
 */
export const createIndex = (length = 8): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  const randomBuffer = randomBytes(length);
  return Array.from(randomBuffer, (byte) => characters[byte % charactersLength]).join('');
};

export const createIndices = (length: number): string[] => Array.from({ length }).map(() => createIndex());

export const insertIndices = (indices: string[], i: number, n: number, max: number) => {
  if (i + n > max) {
    throw new RangeException(i + n);
  }

  const idx = createIndices(n);
  indices.splice(i, 0, ...idx);
};

export const initialize = (
  sheet: SheetType,
  { rows = DEFAULT_ROWS, columns = DEFAULT_COLUMNS }: Partial<SheetSize> = {},
) => {
  if (!sheet.rows.length) {
    insertIndices(sheet.rows, 0, rows, MAX_ROWS);
  }
  if (!sheet.columns.length) {
    insertIndices(sheet.columns, 0, columns, MAX_COLUMNS);
  }
};

/**
 * E.g., "A1" => "CA2@CB3".
 */
export const addressToIndex = (sheet: SheetType, cell: CellAddress): string => {
  return `${sheet.columns[cell.column]}@${sheet.rows[cell.row]}`;
};

/**
 * E.g., "CA2@CB3" => "A1".
 */
export const addressFromIndex = (sheet: SheetType, idx: string): CellAddress => {
  const [column, row] = idx.split('@');
  return {
    column: sheet.columns.indexOf(column),
    row: sheet.rows.indexOf(row),
  };
};

/**
 * E.g., "A1:B2" => "CA2@CB3:CC4@CD5".
 */
export const rangeToIndex = (sheet: SheetType, range: CellRange): string => {
  return [range.from, range.to ?? range.from].map((cell) => addressToIndex(sheet, cell)).join(':');
};

/**
 * E.g., "CA2@CB3:CC4@CD5" => "A1:B2".
 */
export const rangeFromIndex = (sheet: SheetType, idx: string): CellRange => {
  const [from, to] = idx.split(':').map((index) => addressFromIndex(sheet, index));
  return { from, to };
};

/**
 * Find closest cell to cursor.
 */
export const closest = (cursor: CellAddress, cells: CellAddress[]): CellAddress | undefined => {
  let closestCell: CellAddress | undefined;
  let closestDistance = Number.MAX_SAFE_INTEGER;

  for (const cell of cells) {
    const distance = Math.abs(cell.row - cursor.row) + Math.abs(cell.column - cursor.column);
    if (distance < closestDistance) {
      closestCell = cell;
      closestDistance = distance;
    }
  }

  return closestCell;
};

/**
 * Compares the positions of two cell indexes in a sheet.
 * Sorts primarily by row, then by column if rows are equal.
 */
export const compareIndexPositions = (sheet: SheetType, indexA: string, indexB: string): number => {
  const { row: rowA, column: columnA } = addressFromIndex(sheet, indexA);
  const { row: rowB, column: columnB } = addressFromIndex(sheet, indexB);

  // Sort by row first, then by column.
  if (rowA !== rowB) {
    return rowA - rowB;
  } else {
    return columnA - columnB;
  }
};
