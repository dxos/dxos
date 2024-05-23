/**
 * Joins two untyped tables on the given columns.
 * @param leftColumn The column to join on in the first table.
 * @param rightColumn The column to join on in the second table.
 */
//
// Copyright 2024 DXOS.org
//

export const joinTables = (
  leftColumn: string,
  rightColumn: string,
  left: Record<string, any>[],
  right: Record<string, any>[],
) => {
  const map = new Map();
  const used = new Set();
  for (const row of right) {
    map.set(row[rightColumn], row);
  }

  const result = [];
  for (const row of left) {
    const right = map.get(row[leftColumn]);
    used.add(right);

    result.push(Object.assign(right ?? {}, row));
  }

  // Add unmatched rows from the right table.
  for (const row of right) {
    if (!used.has(row)) {
      result.push(row);
    }
  }

  return result;
};
