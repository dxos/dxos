//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { type GridEditing, type GridContentProps } from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';

import { addressFromIndex, type CellAddress, type SheetModel, type FormattingModel } from '../../model';

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

const createDxGridCells = (model: SheetModel, formatting: FormattingModel) => {
  return Object.keys(model.sheet.cells).reduce((acc: NonNullable<GridContentProps['cells']>, sheetCellIndex) => {
    const address = addressFromIndex(model.sheet, sheetCellIndex);
    const cell = formatting.getFormatting(address);
    if (cell.value) {
      acc[`${address.column},${address.row}`] = { value: cell.value, className: mx(cell.classNames) };
    }
    return acc;
  }, {});
};

export const useSheetModelDxGridCells = (model: SheetModel, formatting: FormattingModel): GridContentProps['cells'] => {
  const [dxGridCells, setDxGridCells] = useState<GridContentProps['cells']>(createDxGridCells(model, formatting));

  useEffect(() => {
    const accessor = createDocAccessor(model.sheet, ['cells']);
    const handleUpdate = () => {
      setDxGridCells(createDxGridCells(model, formatting));
    };
    accessor.handle.addListener('change', handleUpdate);
    return () => accessor.handle.removeListener('change', handleUpdate);
  }, [model, formatting]);

  return dxGridCells;
};
