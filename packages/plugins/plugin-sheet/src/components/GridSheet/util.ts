//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { type GridEditing, type GridContentProps } from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';

import { addressFromIndex, type CellAddress } from '../../defs';
import { type SheetModel, type FormattingModel } from '../../model';

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

const createDxGridColumns = (model: SheetModel): GridContentProps['columns'] => {
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
  const [dxGridColumns, setDxGridColumns] = useState<GridContentProps['columns']>(createDxGridColumns(model));
  const [dxGridRows, setDxGridRows] = useState<GridContentProps['rows']>(createDxGridColumns(model));

  useEffect(() => {
    const cellsAccessor = createDocAccessor(model.sheet, ['cells']);
    const handleCellsUpdate = () => {
      setDxGridCells(createDxGridCells(model, formatting));
    };
    cellsAccessor.handle.addListener('change', handleCellsUpdate);
    return () => cellsAccessor.handle.removeListener('change', handleCellsUpdate);
  }, [model, formatting]);

  useEffect(() => {
    const columnMetaAccessor = createDocAccessor(model.sheet, ['columnMeta']);
    const rowMetaAccessor = createDocAccessor(model.sheet, ['rowMeta']);
    const handleColumnMetaUpdate = () => {
      setDxGridColumns(createDxGridColumns(model));
    };
    const handleRowMetaUpdate = () => {
      setDxGridRows(createDxGridRows(model));
    };
    columnMetaAccessor.handle.addListener('change', handleColumnMetaUpdate);
    rowMetaAccessor.handle.addListener('change', handleRowMetaUpdate);
    return () => {
      columnMetaAccessor.handle.removeListener('change', handleColumnMetaUpdate);
      rowMetaAccessor.handle.removeListener('change', handleRowMetaUpdate);
    };
  }, [model]);

  return { cells: dxGridCells, columns: dxGridColumns, rows: dxGridRows };
};
