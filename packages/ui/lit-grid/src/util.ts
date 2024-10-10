//
// Copyright 2024 DXOS.org
//

import { type CellIndex, type DxGridPosition } from './types';

/**
 * Separator for serializing cell position vectors
 */
export const separator = ',';

export const toCellIndex = (cellCoords: DxGridPosition): CellIndex => `${cellCoords.col}${separator}${cellCoords.row}`;

//
// A1 notation is the fallback for numbering columns and rows.
//

export const colToA1Notation = (col: number): string => {
  return (
    (col >= 26 ? String.fromCharCode('A'.charCodeAt(0) + Math.floor(col / 26) - 1) : '') +
    String.fromCharCode('A'.charCodeAt(0) + (col % 26))
  );
};

export const rowToA1Notation = (row: number): string => {
  return `${row + 1}`;
};
