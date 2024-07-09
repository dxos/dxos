//
// Copyright 2024 DXOS.org
//

interface Range {
  to: number;
  from: number;
}

/**
 * Determines if two ranges overlap.
 * A range is considered to overlap if there is any intersection
 * between the two ranges, inclusive of their boundaries.
 */
export const overlap = (a: Range, b: Range): boolean => a.from <= b.to && a.to >= b.from;
