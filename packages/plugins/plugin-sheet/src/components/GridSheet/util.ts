//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { type GridEditing, type GridContentProps } from '@dxos/react-ui-grid';

import { addressFromIndex, type CellAddress, type SheetModel } from '../../model';

export const dxGridCellIndexToSheetCellAddress = (gridIndex: GridEditing): CellAddress | null => {
  if (!gridIndex) {
    return null;
  }
  const [colStr, rowStr] = gridIndex.split(',');
  return {
    column: parseInt(colStr),
    row: parseInt(rowStr),
  };
};

const renderDxGridCells = (model: SheetModel) => {
  return Object.keys(model.sheet.cells).reduce((acc: NonNullable<GridContentProps['cells']>, sheetCellIndex) => {
    const address = addressFromIndex(model.sheet, sheetCellIndex);
    const text = model.getCellText(address);
    if (text) {
      acc[`${address.column},${address.row}`] = { value: text };
    }
    return acc;
  }, {});
};

export const useSheetModelDxGridCells = (model: SheetModel): GridContentProps['cells'] => {
  const [dxGridCells, setDxGridCells] = useState<GridContentProps['cells']>(renderDxGridCells(model));

  useEffect(() => {
    const accessor = createDocAccessor(model.sheet, ['cells']);
    const handleUpdate = () => {
      setDxGridCells(renderDxGridCells(model));
    };
    accessor.handle.addListener('change', handleUpdate);
    return () => accessor.handle.removeListener('change', handleUpdate);
  }, [model]);

  return dxGridCells;
};
