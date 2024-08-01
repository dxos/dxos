//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

// TODO(burdon): Arbitrary limits.
const MAX_COLUMNS = 26 * 26;
const MAX_ROWS = 1_000;

export type Pos = { column: number; row: number };

export type Range = { from: Pos; to?: Pos };

export const posEquals = (a: Pos | undefined, b: Pos | undefined) => a?.column === b?.column && a?.row === b?.row;

export const toA1Notation = ({ column, row }: Pos): string => {
  invariant(column < MAX_COLUMNS, `Invalid column: ${column}`);
  invariant(row < MAX_ROWS, `Invalid row: ${row}`);
  const col =
    (column >= 26 ? String.fromCharCode('A'.charCodeAt(0) + Math.floor(column / 26) - 1) : '') +
    String.fromCharCode('A'.charCodeAt(0) + (column % 26));
  return `${col}${row + 1}`;
};

export const rangeToA1Notation = (range: Range) =>
  [range?.from && toA1Notation(range?.from), range?.to && toA1Notation(range?.to)].filter(Boolean).join(':');

export const fromA1Notation = (notation: string): Pos => {
  const match = notation.match(/([A-Z]+)(\d+)/);
  invariant(match, `Invalid notation: ${notation}`);
  const column = match[1].split('').reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 'A'.charCodeAt(0) + 1, 0) - 1;
  const row = parseInt(match[2], 10) - 1;
  return { column, row };
};
