//
// Copyright 2024 DXOS.org
//

import { type CellAddress } from '../../model';

// TODO(Zan): The anchor should be a cell ID so that it's durable when
// cells are moved around.
export const Anchor = {
  ofCellAddress: (location: CellAddress): string => `${location.row}:${location.column}`,
  toCellAddress: (anchor: string): CellAddress => {
    const [row, column] = anchor.split(':');
    return { row: parseInt(row), column: parseInt(column) };
  },
};
