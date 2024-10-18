//
// Copyright 2024 DXOS.org
//

/**
 * Generates a string key for a cell based on its column and row indices.
 */
export const getCellKey = (col: number, row: number) => {
  return `${col},${row}` as const;
};

/**
 * Converts a cell key string back into column and row coordinates.
 */
export const cellKeyToCoords = (key: string): { row: number; col: number } => {
  const [col, row] = key.split(',').map(Number);
  return { row, col };
};
