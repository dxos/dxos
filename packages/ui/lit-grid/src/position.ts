//
// Copyright 2024 DXOS.org
//

export type PhysicalPosition = { c: number; r: number };

export type CellRange = { from: PhysicalPosition; to?: PhysicalPosition };

export const separator = ',';

export const posEquals = (a: PhysicalPosition | undefined, b: PhysicalPosition | undefined) =>
  a?.c === b?.c && a?.r === b?.r;

export const colToA1Notation = (c: number): string => {
  return (
    (c >= 26 ? String.fromCharCode('A'.charCodeAt(0) + Math.floor(c / 26) - 1) : '') +
    String.fromCharCode('A'.charCodeAt(0) + (c % 26))
  );
};

export const rowToA1Notation = (r: number): string => {
  return `${r + 1}`;
};

export const posFromNumericNotation = (coord: string): PhysicalPosition => {
  const [cStr, rStr] = coord.split(separator);
  if (!cStr || !rStr) {
    throw Error('[posFromNumericNotation] Bad input');
  }
  return { c: parseInt(cStr), r: parseInt(rStr) };
};

export const inRange = (range: CellRange | undefined, pos: PhysicalPosition): boolean => {
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

  const { c, r } = pos;

  const { c: c1, r: r1 } = from;
  const { c: c2, r: r2 } = to;
  const cMin = Math.min(c1, c2);
  const cMax = Math.max(c1, c2);
  const rMin = Math.min(r1, r2);
  const rMax = Math.max(r1, r2);

  return c >= cMin && c <= cMax && r >= rMin && r <= rMax;
};
