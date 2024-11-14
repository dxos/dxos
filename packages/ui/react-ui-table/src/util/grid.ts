//
// Copyright 2023 DXOS.org
//

import { type DxGridCellIndex } from '@dxos/react-ui-grid';

// TODO(burdon): Factor out to grid.
export type GridCell = { col: number; row: number };

/**
 * Generates a string key for a cell based on its column and row indices.
 */
export const fromGridCell = ({ col, row }: GridCell): DxGridCellIndex => {
  return `${col},${row}` as const; // TODO(burdon): ":" delim.
};

/**
 * Converts a cell key string back into column and row coordinates.
 */
export const toGridCell = (cell: DxGridCellIndex): GridCell => {
  const [col, row] = cell.split(',').map(Number);
  return { row, col };
};
