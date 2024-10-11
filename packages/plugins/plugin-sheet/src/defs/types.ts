//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type DxGridPosition, type DxGridRange } from '@dxos/react-ui-grid';

export const DEFAULT_ROWS = 50;
export const DEFAULT_COLUMNS = 26;

export const MAX_ROWS = 500;
export const MAX_COLUMNS = 26 * 2;

export type CellAddress = DxGridPosition;

export type CellRange = Omit<DxGridRange, 'end'> & Partial<Pick<DxGridRange, 'end'>>;

export type CellIndex = string;

export type CellContentValue = number | string | boolean | null;

export const posEquals = (a: CellAddress | undefined, b: CellAddress | undefined) => {
  return a?.col === b?.col && a?.row === b?.row;
};

export const columnLetter = (col: number): string => {
  invariant(col < MAX_COLUMNS, `Invalid column: ${col}`);
  return (
    (col >= 26 ? String.fromCharCode('A'.charCodeAt(0) + Math.floor(col / 26) - 1) : '') +
    String.fromCharCode('A'.charCodeAt(0) + (col % 26))
  );
};

export const addressToA1Notation = ({ col, row }: Omit<CellAddress, 'plane'>): string => {
  return `${columnLetter(col)}${row + 1}`;
};

// TODO(burdon): See simpleCellAddressFromString
export const addressFromA1Notation = (ref: string): CellAddress => {
  const match = ref.match(/([A-Z]+)(\d+)/);
  invariant(match, `Invalid notation: ${ref}`);
  return {
    row: parseInt(match[2], 10) - 1,
    col: match[1].split('').reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 'A'.charCodeAt(0) + 1, 0) - 1,
    plane: 'grid',
  };
};

export const rangeToA1Notation = (range: CellRange) => {
  return [range?.start && addressToA1Notation(range?.start), range?.end && addressToA1Notation(range?.end)]
    .filter(Boolean)
    .join(':');
};

export const rangeFromA1Notation = (ref: string): CellRange => {
  const [start, end] = ref.split(':').map(addressFromA1Notation);
  return { start, end };
};

export const inRange = (range: CellRange | undefined, cell: CellAddress): boolean => {
  if (!range) {
    return false;
  }

  const { start, end } = range;
  if ((start && posEquals(start, cell)) || (end && posEquals(end, cell))) {
    return true;
  }

  if (!start || !end) {
    return false;
  }

  const { col: c1, row: r1 } = start;
  const { col: c2, row: r2 } = end;
  const cMin = Math.min(c1, c2);
  const cMax = Math.max(c1, c2);
  const rMin = Math.min(r1, r2);
  const rMax = Math.max(r1, r2);

  const { col, row } = cell;
  return col >= cMin && col <= cMax && row >= rMin && row <= rMax;
};
