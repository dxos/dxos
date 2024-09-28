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

const createDxGridColumnns = (model: SheetModel): GridContentProps['columns'] => {
  return model.sheet.columns.reduce((acc: NonNullable<GridContentProps['columns']>, columnId, numericIndex) => {
    if (model.sheet.columnMeta[columnId] && model.sheet.columnMeta[columnId].size) {
      acc[numericIndex] = { size: model.sheet.columnMeta[columnId].size, resizeable: true };
    }
    return acc;
  }, {});
};

const createDxGridRows = (model: SheetModel): GridContentProps['rows'] => {
  return model.sheet.rows.reduce((acc: NonNullable<GridContentProps['rows']>, rowId, numericIndex) => {
    if (model.sheet.rowMeta[rowId] && model.sheet.rowMeta[rowId].size) {
      acc[numericIndex] = { size: model.sheet.rowMeta[rowId].size, resizeable: true };
    }
    return acc;
  }, {});
};

export const useSheetModelDxGridProps = (
  model: SheetModel,
  formatting: FormattingModel,
): Pick<GridContentProps, 'cells' | 'columns' | 'rows'> => {
  const [dxGridCells, setDxGridCells] = useState<GridContentProps['cells']>(createDxGridCells(model, formatting));
  const [dxGridColumns, setDxGridColumns] = useState<GridContentProps['columns']>(createDxGridColumnns(model));
  const [dxGridRows, setDxGridRows] = useState<GridContentProps['rows']>(createDxGridColumnns(model));

  useEffect(() => {
    const accessor = createDocAccessor(model.sheet, ['cells']);
    const handleUpdate = () => {
      setDxGridCells(createDxGridCells(model, formatting));
      setDxGridColumns(createDxGridColumnns(model));
      setDxGridRows(createDxGridRows(model));
    };
    accessor.handle.addListener('change', handleUpdate);
    return () => accessor.handle.removeListener('change', handleUpdate);
  }, [model, formatting]);

  return { cells: dxGridCells, columns: dxGridColumns, rows: dxGridRows };
};
