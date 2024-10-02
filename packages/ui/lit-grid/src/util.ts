//
// Copyright 2024 DXOS.org
//

import { type CellIndex, type DxGridPosition } from './types';

/**
 * Separator for serializing cell position vectors
 */
export const separator = ',';

export const toCellIndex = (cellCoords: DxGridPosition): CellIndex => `${cellCoords.col}${separator}${cellCoords.row}`;
