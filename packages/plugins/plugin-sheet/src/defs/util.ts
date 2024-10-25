//
// Copyright 2024 DXOS.org
//

import { randomBytes } from '@dxos/crypto';
import { create } from '@dxos/echo-schema';

import {
  addressFromA1Notation,
  type CellAddress,
  type CellRange,
  DEFAULT_COLUMNS,
  DEFAULT_ROWS,
  MAX_COLUMNS,
  MAX_ROWS,
} from './types';
import { type CreateSheetOptions, type SheetSize, SheetType } from '../types';

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

export const createSheet = ({ name, cells, ...size }: CreateSheetOptions = {}): SheetType => {
  const sheet = create(SheetType, {
    name,
    cells: {},
    rows: [],
    columns: [],
    rowMeta: {},
    columnMeta: {},
    ranges: [],
  });

  initialize(sheet, size);

  if (cells) {
    Object.entries(cells).forEach(([key, { value }]) => {
      const idx = addressToIndex(sheet, addressFromA1Notation(key));
      sheet.cells[idx] = { value };
    });
  }

  return sheet;
};

/**
 * E.g., "A1" => "CA2@CB3".
 */
export const addressToIndex = (sheet: SheetType, cell: CellAddress): string => {
  return `${sheet.columns[cell.col]}@${sheet.rows[cell.row]}`;
};

/**
 * E.g., "CA2@CB3" => "A1".
 */
export const addressFromIndex = (sheet: SheetType, idx: string): CellAddress => {
  const [column, row] = idx.split('@');
  return {
    col: sheet.columns.indexOf(column),
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
 * Compares the positions of two cell indexes in a sheet.
 * Sorts primarily by row, then by column if rows are equal.
 */
export const compareIndexPositions = (sheet: SheetType, indexA: string, indexB: string): number => {
  const { row: rowA, col: columnA } = addressFromIndex(sheet, indexA);
  const { row: rowB, col: columnB } = addressFromIndex(sheet, indexB);

  // Sort by row first, then by column.
  if (rowA !== rowB) {
    return rowA - rowB;
  } else {
    return columnA - columnB;
  }
};
