//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

// TODO(burdon): Reconcile with DxGridPlanePosition.
export type CellAddress = Record<'row' | 'col', number>;
// TODO(burdon): Unify and use Partial<CellRange> as needed.
export type CellRange = { from: CellAddress; to?: CellAddress };
export type CompleteCellRange = { from: CellAddress; to: CellAddress };

export type CellScalarValue = number | string | boolean | null;

export const RANGE_NOTATION = /^[A-Z]+[0-9]+(:[A-Z]+[0-9]+)?$/;

export const isFormula = (value: any): value is string => typeof value === 'string' && value.charAt(0) === '=';

export const cellEquals = (a: CellAddress | undefined, b: CellAddress | undefined) =>
  a?.col === b?.col && a?.row === b?.row;

export const columnLetter = (col: number): string => {
  invariant(col < 676, `Invalid column: ${col}`); // 26^2
  return (
    (col >= 26 ? String.fromCharCode('A'.charCodeAt(0) + Math.floor(col / 26) - 1) : '') +
    String.fromCharCode('A'.charCodeAt(0) + (col % 26))
  );
};

export const addressToA1Notation = ({ col, row }: CellAddress): string => `${columnLetter(col)}${row + 1}`;

// TODO(burdon): See (HF) simpleCellAddressFromString.
export const addressFromA1Notation = (ref: string): CellAddress => {
  const match = ref.match(/([A-Z]+)(\d+)/);
  invariant(match, `Invalid notation: ${ref}`);
  return {
    row: parseInt(match[2], 10) - 1,
    col: match[1].split('').reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 'A'.charCodeAt(0) + 1, 0) - 1,
  };
};

export const rangeToA1Notation = (range: CellRange) =>
  [range?.from && addressToA1Notation(range?.from), range?.to && addressToA1Notation(range?.to)]
    .filter(Boolean)
    .join(':');

export const rangeFromA1Notation = (ref: string): CellRange => {
  const [from, to] = ref.split(':').map(addressFromA1Notation);
  return { from, to };
};

export const inRange = (range: CellRange | undefined, cell: CellAddress): boolean => {
  if (!range) {
    return false;
  }

  const { from, to } = range;
  if ((from && cellEquals(from, cell)) || (to && cellEquals(to, cell))) {
    return true;
  }

  if (!from || !to) {
    return false;
  }

  const { col: c1, row: r1 } = from;
  const { col: c2, row: r2 } = to;

  const cMin = Math.min(c1, c2);
  const cMax = Math.max(c1, c2);
  const rMin = Math.min(r1, r2);
  const rMax = Math.max(r1, r2);

  const { col, row } = cell;
  return col >= cMin && col <= cMax && row >= rMin && row <= rMax;
};
