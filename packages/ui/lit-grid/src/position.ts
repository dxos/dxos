//
// Copyright 2024 DXOS.org
//

export type CellPosition = { i: number; j: number };

export type CellRange = { from: CellPosition; to?: CellPosition };

export const posEquals = (a: CellPosition | undefined, b: CellPosition | undefined) => a?.i === b?.i && a?.j === b?.j;

export const colToA1Notation = (column: number): string => {
  return (
    (column >= 26 ? String.fromCharCode('A'.charCodeAt(0) + Math.floor(column / 26) - 1) : '') +
    String.fromCharCode('A'.charCodeAt(0) + (column % 26))
  );
};

export const rowToA1Notation = (row: number): string => {
  return `${row + 1}`;
};

export const posToA1Notation = (column: number, row: number): string => {
  const columnA1 = colToA1Notation(column);
  const rowA1 = rowToA1Notation(row);
  return `${columnA1}${rowA1}`;
};

export const posFromA1Notation = (notation: string): CellPosition => {
  const match = notation.match(/([A-Z]+)(\d+)/);
  if (!match) {
    throw Error('[posFromA1Notation] No match.');
  }
  const column = match[1].split('').reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 'A'.charCodeAt(0) + 1, 0) - 1;
  const row = parseInt(match[2], 10) - 1;
  return { i: column, j: row };
};

export const posFromNumericNotation = (notation: string): CellPosition => {
  const [iStr, jStr] = notation.split(',');
  if (!iStr || !jStr) {
    throw Error('[posFromNumericNotation] Bad input');
  }
  return { i: parseInt(iStr), j: parseInt(jStr) };
};

export const rangeToA1Notation = (range: CellRange) =>
  [range?.from && posToA1Notation(range?.from.i, range?.from.j), range?.to && posToA1Notation(range?.to.i, range.to.j)]
    .filter(Boolean)
    .join(':');

export const rangeFromA1Notation = (notation: string): CellRange => {
  const [from, to] = notation.split(':').map(posFromA1Notation);
  return { from, to };
};

export const inRange = (range: CellRange | undefined, pos: CellPosition): boolean => {
  if (!range) {
    return false;
  }

  const { from, to } = range;
  if ((from && posEquals(from, pos)) || (to && posEquals(to, pos))) {
    return true;
  }

  if (!from || !to) {
    return false;
  }

  const { i, j } = pos;

  const { i: c1, j: r1 } = from;
  const { i: c2, j: r2 } = to;
  const cMin = Math.min(c1, c2);
  const cMax = Math.max(c1, c2);
  const rMin = Math.min(r1, r2);
  const rMax = Math.max(r1, r2);

  return i >= cMin && i <= cMax && j >= rMin && j <= rMax;
};
