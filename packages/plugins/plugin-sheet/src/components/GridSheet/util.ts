//
// Copyright 2024 DXOS.org
//

import { type MutableRefObject, useEffect, useLayoutEffect, useState } from 'react';

import { createDocAccessor, fullyQualifiedId } from '@dxos/react-client/echo';
import { parseValue, cellClassesForFieldType } from '@dxos/react-ui-data';
import {
  type GridContentProps,
  type DxGridElement,
  type DxGridAxisMeta,
  type DxGridPlane,
  type DxGridPlaneRange,
  type DxGridPlaneCells,
  type DxGridCellValue,
  colToA1Notation,
  rowToA1Notation,
  commentedClassName,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';

import { type CellAddress, inRange, cellClassNameForRange } from '../../defs';
import { parseThreadAnchorAsCellRange } from '../../integrations';
import { type SheetModel } from '../../model';

export const dxGridCellIndexToSheetCellAddress = (index: string): CellAddress => {
  const [colStr, rowStr] = index.split(',');
  return {
    col: parseInt(colStr),
    row: parseInt(rowStr),
  };
};

const createDxGridColumns = (model: SheetModel): DxGridAxisMeta => {
  return model.sheet.columns.reduce(
    (acc: DxGridAxisMeta, columnId, numericIndex) => {
      if (model.sheet.columnMeta[columnId] && model.sheet.columnMeta[columnId].size) {
        acc.grid[numericIndex] = { size: model.sheet.columnMeta[columnId].size, resizeable: true };
      }
      return acc;
    },
    { grid: {} },
  );
};

const createDxGridRows = (model: SheetModel): DxGridAxisMeta => {
  return model.sheet.rows.reduce(
    (acc: DxGridAxisMeta, rowId, numericIndex) => {
      if (model.sheet.rowMeta[rowId] && model.sheet.rowMeta[rowId].size) {
        acc.grid[numericIndex] = { size: model.sheet.rowMeta[rowId].size, resizeable: true };
      }
      return acc;
    },
    { grid: {} },
  );
};

const projectCellProps = (model: SheetModel, col: number, row: number): DxGridCellValue => {
  const address = { col, row };
  const rawValue = model.getValue(address);
  if (rawValue === undefined || rawValue === null) {
    return { value: '' };
  }
  const ranges = model.sheet.ranges?.filter(({ range }) => inRange(range, address));
  const threadRefs = model.sheet.threads
    ?.filter((thread) => {
      const range = thread?.anchor && parseThreadAnchorAsCellRange(thread!.anchor);
      return thread && range ? inRange(range, address) : false;
    })
    .map((thread) => fullyQualifiedId(thread!))
    .join(' ');
  const type = model.getValueType(address);
  const classNames = ranges?.map(cellClassNameForRange).reverse();

  return {
    value: parseValue(type, rawValue),
    className: mx(cellClassesForFieldType(type), threadRefs && commentedClassName, classNames),
    dataRefs: threadRefs,
  };
};

const gridCellGetter = (model: SheetModel) => {
  // TODO(thure): Actually use the cache.
  const cachedGridCells: DxGridPlaneCells = {};
  return (nextBounds: DxGridPlaneRange): DxGridPlaneCells => {
    [...Array(nextBounds.end.col - nextBounds.start.col)].forEach((_, c0) => {
      return [...Array(nextBounds.end.row - nextBounds.start.row)].forEach((_, r0) => {
        const col = nextBounds.start.col + c0;
        const row = nextBounds.start.row + r0;
        cachedGridCells[`${col},${row}`] = projectCellProps(model, col, row);
      });
    });
    return cachedGridCells;
  };
};

export const rowLabelCell = (row: number) => ({
  value: rowToA1Notation(row),
  className: 'text-end !pie-1',
  resizeHandle: 'row',
});

export const colLabelCell = (col: number) => ({ value: colToA1Notation(col), resizeHandle: 'col' });

const cellGetter = (model: SheetModel) => {
  const getGridCells = gridCellGetter(model);
  return (nextBounds: DxGridPlaneRange, plane: DxGridPlane): DxGridPlaneCells => {
    switch (plane) {
      case 'grid':
        return getGridCells(nextBounds);
      case 'frozenColsStart':
        return [...Array(nextBounds.end.row - nextBounds.start.row)].reduce((acc, _, r0) => {
          const r = nextBounds.start.row + r0;
          acc[`0,${r}`] = rowLabelCell(r);
          return acc;
        }, {});
      case 'frozenRowsStart':
        return [...Array(nextBounds.end.col - nextBounds.start.col)].reduce((acc, _, c0) => {
          const c = nextBounds.start.col + c0;
          acc[`${c},0`] = colLabelCell(c);
          return acc;
        }, {});
      default:
        return {};
    }
  };
};

export const useSheetModelDxGridProps = (
  dxGridRef: MutableRefObject<DxGridElement | null>,
  model: SheetModel,
): Pick<GridContentProps, 'columns' | 'rows'> => {
  const [columns, setColumns] = useState<DxGridAxisMeta>(createDxGridColumns(model));
  const [rows, setRows] = useState<DxGridAxisMeta>(createDxGridColumns(model));

  useLayoutEffect(() => {
    const cellsAccessor = createDocAccessor(model.sheet, ['cells']);
    if (dxGridRef.current) {
      dxGridRef.current.getCells = cellGetter(model);
    }
    const handleCellsUpdate = () => {
      dxGridRef.current?.requestUpdate('initialCells');
    };
    cellsAccessor.handle.addListener('change', handleCellsUpdate);
    return () => cellsAccessor.handle.removeListener('change', handleCellsUpdate);
  }, [model]);

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
