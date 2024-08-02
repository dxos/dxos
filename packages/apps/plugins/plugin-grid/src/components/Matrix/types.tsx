//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

// TODO(burdon): Arbitrary limits.
const MAX_COLUMNS = 26 * 26;
const MAX_ROWS = 1_000;

// TODO(burdon): Add styles.
export const CellSchema = S.Struct({
  // TODO(burdon): Automerge (long string) or short string or number.
  value: S.Any,
});

export type CellSchema = S.Schema.Type<typeof CellSchema>;

export class SheetType extends TypedObject({ typename: 'dxos.org/type/SheetType', version: '0.1.0' })({
  title: S.optional(S.String),
  // Cells indexed by A1 reference.
  // TODO(burdon): Not robust to adding rows/columns.
  cells: S.mutable(S.Record(S.String, S.mutable(CellSchema))).pipe(S.default({})),
}) {}

export type Pos = { column: number; row: number };

export type Range = { from: Pos; to?: Pos };

// TODO(burdon): Tests.

export const posEquals = (a: Pos | undefined, b: Pos | undefined) => a?.column === b?.column && a?.row === b?.row;

export const posToA1Notation = ({ column, row }: Pos): string => {
  invariant(column < MAX_COLUMNS, `Invalid column: ${column}`);
  invariant(row < MAX_ROWS, `Invalid row: ${row}`);
  const col =
    (column >= 26 ? String.fromCharCode('A'.charCodeAt(0) + Math.floor(column / 26) - 1) : '') +
    String.fromCharCode('A'.charCodeAt(0) + (column % 26));
  return `${col}${row + 1}`;
};

export const posFromA1Notation = (notation: string): Pos => {
  const match = notation.match(/([A-Z]+)(\d+)/);
  invariant(match, `Invalid notation: ${notation}`);
  const column = match[1].split('').reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 'A'.charCodeAt(0) + 1, 0) - 1;
  const row = parseInt(match[2], 10) - 1;
  return { column, row };
};

export const rangeToA1Notation = (range: Range) =>
  [range?.from && posToA1Notation(range?.from), range?.to && posToA1Notation(range?.to)].filter(Boolean).join(':');

export const rangeFromA1Notation = (notation: string): Range => {
  const [from, to] = notation.split(':').map(posFromA1Notation);
  return { from, to };
};

export const inRange = (range: Range | undefined, pos: Pos): boolean => {
  if (!range) {
    return false;
  }

  const { from, to } = range;
  if (!from || !to) {
    return false;
  }

  const { column, row } = pos;

  const { column: c1, row: r1 } = from;
  const { column: c2, row: r2 } = to;
  const cMin = Math.min(c1, c2);
  const cMax = Math.max(c1, c2);
  const rMin = Math.min(r1, r2);
  const rMax = Math.max(r1, r2);

  return column >= cMin && column <= cMax && row >= rMin && row <= rMax;
};
