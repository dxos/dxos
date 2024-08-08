//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

// TODO(burdon): Arbitrary limits.
export const MAX_COLUMNS = 26 * 26;
export const MAX_ROWS = 1_000;

export type CellPosition = { column: number; row: number };

// TODO(burdon): Change to A1 notation (so able to represent columns/rows: A, A1:A3, etc.)
export type CellRange = { from: CellPosition; to?: CellPosition };

export const posEquals = (a: CellPosition | undefined, b: CellPosition | undefined) => {
  return a?.column === b?.column && a?.row === b?.row;
};

export const columnLetter = (column: number): string => {
  invariant(column < MAX_COLUMNS, `Invalid column: ${column}`);
  return (
    (column >= 26 ? String.fromCharCode('A'.charCodeAt(0) + Math.floor(column / 26) - 1) : '') +
    String.fromCharCode('A'.charCodeAt(0) + (column % 26))
  );
};

export const cellToA1Notation = ({ column, row }: CellPosition): string => {
  invariant(column < MAX_COLUMNS, `Invalid column: ${column}`);
  invariant(row < MAX_ROWS, `Invalid row: ${row}`);
  return `${columnLetter(column)}${row + 1}`;
};

export const cellFromA1Notation = (ref: string): CellPosition => {
  const match = ref.match(/([A-Z]+)(\d+)/);
  invariant(match, `Invalid notation: ${ref}`);
  return {
    column: match[1].split('').reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 'A'.charCodeAt(0) + 1, 0) - 1,
    row: parseInt(match[2], 10) - 1,
  };
};

export const rangeToA1Notation = (range: CellRange) => {
  return [range?.from && cellToA1Notation(range?.from), range?.to && cellToA1Notation(range?.to)]
    .filter(Boolean)
    .join(':');
};

export const rangeFromA1Notation = (ref: string): CellRange => {
  const [from, to] = ref.split(':').map(cellFromA1Notation);
  return { from, to };
};

export const inRange = (range: CellRange | undefined, cell: CellPosition): boolean => {
  if (!range) {
    return false;
  }

  const { from, to } = range;
  if ((from && posEquals(from, cell)) || (to && posEquals(to, cell))) {
    return true;
  }

  if (!from || !to) {
    return false;
  }

  const { column: c1, row: r1 } = from;
  const { column: c2, row: r2 } = to;
  const cMin = Math.min(c1, c2);
  const cMax = Math.max(c1, c2);
  const rMin = Math.min(r1, r2);
  const rMax = Math.max(r1, r2);

  const { column, row } = cell;
  return column >= cMin && column <= cMax && row >= rMin && row <= rMax;
};
