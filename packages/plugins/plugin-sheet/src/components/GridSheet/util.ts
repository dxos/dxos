//
// Copyright 2024 DXOS.org
//

import { type MutableRefObject, useEffect, useLayoutEffect, useState } from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import {
  type GridEditing,
  type GridContentProps,
  type DxGridElement,
  type DxGridCells,
  type DxGridAxisMeta,
  type DxGridRange,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';

import { type CellAddress } from '../../defs';
import { type SheetModel, type FormattingModel } from '../../model';

export const dxGridCellIndexToSheetCellAddress = (gridEditing: GridEditing): CellAddress | null => {
  if (!gridEditing) {
    return null;
  }
  const [colStr, rowStr] = gridEditing.index.split(',');
  return {
    col: parseInt(colStr),
    row: parseInt(rowStr),
  };
};

const createDxGridColumns = (model: SheetModel): DxGridAxisMeta => {
  return model.sheet.columns.reduce((acc: DxGridAxisMeta, columnId, numericIndex) => {
    if (model.sheet.columnMeta[columnId] && model.sheet.columnMeta[columnId].size) {
      acc[numericIndex] = { size: model.sheet.columnMeta[columnId].size, resizeable: true };
    }
    return acc;
  }, {});
};

const createDxGridRows = (model: SheetModel): DxGridAxisMeta => {
  return model.sheet.rows.reduce((acc: DxGridAxisMeta, rowId, numericIndex) => {
    if (model.sheet.rowMeta[rowId] && model.sheet.rowMeta[rowId].size) {
      acc[numericIndex] = { size: model.sheet.rowMeta[rowId].size, resizeable: true };
    }
    return acc;
  }, {});
};

const cellGetter = (model: SheetModel, formatting: FormattingModel) => {
  // TODO(thure): Actually use the cache.
  let _cachedBounds: DxGridRange | null = null;
  const cachedCells: DxGridCells = {};
  return (nextBounds: DxGridRange): DxGridCells => {
    [...Array(nextBounds.end.col - nextBounds.start.col)].forEach((_, c0) => {
      return [...Array(nextBounds.end.row - nextBounds.start.row)].forEach((_, r0) => {
        const column = nextBounds.start.col + c0;
        const row = nextBounds.start.row + r0;
        const cell = formatting.getFormatting({ column, row });
        if (cell.value) {
          cachedCells[`${column},${row}`] = { value: cell.value, className: mx(cell.classNames) };
        }
      });
    });
    _cachedBounds = nextBounds;
    return cachedCells;
  };
};

export const useSheetModelDxGridProps = (
  dxGridRef: MutableRefObject<DxGridElement | null>,
  model: SheetModel,
  formatting: FormattingModel,
): Pick<GridContentProps, 'columns' | 'rows'> => {
  const [columns, setColumns] = useState<DxGridAxisMeta>(createDxGridColumns(model));
  const [rows, setRows] = useState<DxGridAxisMeta>(createDxGridColumns(model));

  useLayoutEffect(() => {
    const cellsAccessor = createDocAccessor(model.sheet, ['cells']);
    if (dxGridRef.current) {
      dxGridRef.current.getCells = cellGetter(model, formatting);
    }
    const handleCellsUpdate = () => {
      dxGridRef.current?.requestUpdate('initialCells');
    };
    cellsAccessor.handle.addListener('change', handleCellsUpdate);
    return () => cellsAccessor.handle.removeListener('change', handleCellsUpdate);
  }, [model, formatting]);

  useEffect(() => {
    const columnMetaAccessor = createDocAccessor(model.sheet, ['columnMeta']);
    const rowMetaAccessor = createDocAccessor(model.sheet, ['rowMeta']);
    const handleColumnMetaUpdate = () => {
      setColumns(createDxGridColumns(model));
    };
    const handleRowMetaUpdate = () => {
      setRows(createDxGridRows(model));
    };
    columnMetaAccessor.handle.addListener('change', handleColumnMetaUpdate);
    rowMetaAccessor.handle.addListener('change', handleRowMetaUpdate);
    return () => {
      columnMetaAccessor.handle.removeListener('change', handleColumnMetaUpdate);
      rowMetaAccessor.handle.removeListener('change', handleRowMetaUpdate);
    };
  }, [model]);

  return { columns, rows };
};
