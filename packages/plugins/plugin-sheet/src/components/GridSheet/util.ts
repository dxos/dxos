//
// Copyright 2024 DXOS.org
//

import { type GridEditing } from '@dxos/react-ui-grid';

import { type CellAddress } from '../../model';

export const gridIndexToCellAddress = (gridIndex: GridEditing): CellAddress | null => {
  if (!gridIndex) {
    return null;
  } else {
    const [colStr, rowStr] = gridIndex.split(',');
    return {
      column: parseInt(colStr),
      row: parseInt(rowStr),
    };
  }
};
