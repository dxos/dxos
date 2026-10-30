//
// Copyright 2024 DXOS.org
//

import {
  type CellAddress,
  type CellRange,
  type CompleteCellRange,
  RANGE_NOTATION,
  addressFromA1Notation,
  addressToA1Notation,
  isFormula,
  rangeFromA1Notation,
} from '@dxos/compute-hyperformula/types';
import { randomBytes } from '@dxos/crypto/random';
import { type Obj } from '@dxos/echo';
import { assertArgument } from '@dxos/invariant';
import type { Selection } from '@dxos/react-ui-attention/types';

import type * as Sheet from '../types/Sheet.ts';

export const MAX_ROWS = 500;
export const MAX_COLS = 676; // 26^2;

export const DEFAULT_ROWS = 50;
export const DEFAULT_COLS = 26;

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
  return idx;
};

export const initialize = (
  sheet: Obj.Mutable<Sheet.Sheet>,
  { rows = DEFAULT_ROWS, columns = DEFAULT_COLS }: Partial<Sheet.SheetSize> = {},
) => {
  if (!sheet.rows.length) {
    insertIndices(sheet.rows, 0, rows, MAX_ROWS);
  }
  if (!sheet.columns.length) {
    insertIndices(sheet.columns, 0, columns, MAX_COLS);
  }
};

/** A cell value as a row of plain data holds it; empty values are left out of the sheet. */
export type RowValue = string | number | boolean | null | undefined;

/**
 * Sheet cells in A1 notation for rows of values, the first row at A1. A string of digits is stored as text (with a
 * leading apostrophe), so a bare year stays a label rather than becoming a number.
 */
export const cellsFromRows = (rows: readonly (readonly RowValue[])[]): Record<string, Sheet.CellValue> =>
  Object.fromEntries(
    rows.flatMap((row, rowIndex) =>
      row.flatMap((value, col) =>
        value == null
          ? []
          : [
              [
                addressToA1Notation({ row: rowIndex, col }),
                { value: typeof value === 'string' && /^\d+$/.test(value) ? `'${value}` : value },
              ],
            ],
      ),
    ),
  );

/**
 * E.g., "A1" => "CA2@CB3".
 */
export const addressToIndex = (sheet: Sheet.Sheet, cell: CellAddress): string => {
  return `${sheet.columns[cell.col]}@${sheet.rows[cell.row]}`;
};

/**
 * E.g., "CA2@CB3" => "A1".
 */
export const addressFromIndex = (sheet: Sheet.Sheet, idx: string): CellAddress => {
  const [column, row] = idx.split('@');
  return {
    col: sheet.columns.indexOf(column),
    row: sheet.rows.indexOf(row),
  };
};

/**
 * E.g., "A1:B2" => "CA2@CB3:CC4@CD5".
 */
export const rangeToIndex = (sheet: Sheet.Sheet, range: CellRange): string => {
  return [range.from, range.to ?? range.from].map((cell) => addressToIndex(sheet, cell)).join(':');
};

/**
 * E.g., "CA2@CB3:CC4@CD5" => "A1:B2".
 */
export const rangeFromIndex = (sheet: Sheet.Sheet, idx: string): CompleteCellRange => {
  const [from, to] = idx.split(':').map((index) => addressFromIndex(sheet, index));
  return { from, to };
};

/**
 * The `AnchoredTo.anchor` of a comment on a cell range: its index range, so it follows its cells as rows and columns
 * are inserted, deleted or moved.
 */
export const rangeToAnchor = (sheet: Sheet.Sheet, range: CellRange): string => rangeToIndex(sheet, range);

/**
 * The anchor for a comment on the sheet's published selection, which is in A1 notation.
 */
export const anchorFromSelection = (
  sheet: Sheet.Sheet,
  selection: Selection.Selection | undefined,
): string | undefined => {
  if (selection?.mode !== 'range' || !selection.from || !selection.to) {
    return undefined;
  }

  const range = completeRange(rangeFromA1Notation(`${selection.from}:${selection.to}`));
  return isInSheet(sheet, range.from) && isInSheet(sheet, range.to) ? rangeToAnchor(sheet, range) : undefined;
};

/**
 * The cells a comment anchor spans, top-left to bottom-right, or `undefined` once a row or column it names is deleted.
 * Also reads the positional anchors stored before {@link rangeToAnchor}: A1 notation (`B2:C3`) and `col,row,col,row`.
 */
export const rangeFromAnchor = (sheet: Sheet.Sheet, anchor: string): CompleteCellRange | undefined => {
  const range = INDEX_RANGE.test(anchor)
    ? rangeFromIndex(sheet, anchor)
    : RANGE_NOTATION.test(anchor)
      ? completeRange(rangeFromA1Notation(anchor))
      : COORDINATE_RANGE.test(anchor)
        ? rangeFromCoordinates(anchor)
        : undefined;
  return range && isInSheet(sheet, range.from) && isInSheet(sheet, range.to) ? normalizeRange(range) : undefined;
};

const INDEX_RANGE = /^[a-zA-Z0-9]+@[a-zA-Z0-9]+:[a-zA-Z0-9]+@[a-zA-Z0-9]+$/;
const COORDINATE_RANGE = /^\d+,\d+,\d+,\d+$/;

const completeRange = ({ from, to = from }: CellRange): CompleteCellRange => ({ from, to });

/** Moving rows or columns can reverse an index range's endpoints. */
const normalizeRange = ({ from, to }: CompleteCellRange): CompleteCellRange => ({
  from: { col: Math.min(from.col, to.col), row: Math.min(from.row, to.row) },
  to: { col: Math.max(from.col, to.col), row: Math.max(from.row, to.row) },
});

const rangeFromCoordinates = (anchor: string): CompleteCellRange => {
  const [fromCol, fromRow, toCol, toRow] = anchor.split(',').map((coord) => parseInt(coord, 10));
  return { from: { col: fromCol, row: fromRow }, to: { col: toCol, row: toRow } };
};

const isInSheet = (sheet: Sheet.Sheet, { col, row }: CellAddress): boolean =>
  col >= 0 && row >= 0 && col < sheet.columns.length && row < sheet.rows.length;

/**
 * Orders comment anchors by the top-left cell of their range, row first; anchors that no longer resolve sort last.
 */
export const compareAnchors = (sheet: Sheet.Sheet, anchorA: string, anchorB: string): number => {
  const a = rangeFromAnchor(sheet, anchorA)?.from;
  const b = rangeFromAnchor(sheet, anchorB)?.from;
  if (!a || !b) {
    return (a ? 0 : 1) - (b ? 0 : 1);
  }

  return a.row !== b.row ? a.row - b.row : a.col - b.col;
};

// TODO(burdon): Tests.

/**
 * Map from A1 notation to indices.
 */
export const mapFormulaRefsToIndices = (sheet: Sheet.Sheet, formula: string): string => {
  assertArgument(isFormula(formula), 'formula');
  return formula.replace(/([a-zA-Z]+)([0-9]+)/g, (match) => {
    const cell = addressFromA1Notation(match);
    // Skip tokens whose parsed address falls outside the sheet bounds or is negative — they are
    // function names (e.g. LOG10, ATAN2) or malformed refs (e.g. A0 → row -1) rather than valid
    // cell references.
    if (cell.col < 0 || cell.row < 0 || cell.col >= sheet.columns.length || cell.row >= sheet.rows.length) {
      return match;
    }
    return addressToIndex(sheet, cell);
  });
};

/**
 * Map from indices to A1 notation.
 */
export const mapFormulaIndicesToRefs = (sheet: Sheet.Sheet, formula: string): string => {
  assertArgument(isFormula(formula), 'formula');
  return formula.replace(/([a-zA-Z0-9]+)@([a-zA-Z0-9]+)/g, (idx) => {
    return addressToA1Notation(addressFromIndex(sheet, idx));
  });
};
