//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { inRange } from '@dxos/compute';
import { createDocAccessor } from '@dxos/echo-db';
import { cellClassesForFieldType, parseValue } from '@dxos/react-ui-form';
import {
  type DxGridAxisMeta,
  type DxGridCellValue,
  type DxGridElement,
  type DxGridPlane,
  type DxGridPlaneCells,
  type DxGridPlaneRange,
  type GridContentProps,
  colToA1Notation,
  commentedClassName,
  rowToA1Notation,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/ui-theme';

import { type SheetModel } from '../../model';
import { cellClassNameForRange, rangeFromIndex } from '../../types';

const createDxGridColumns = (model: SheetModel): DxGridAxisMeta => {
  return model.sheet.columns.reduce(
    (acc: DxGridAxisMeta, columnId, numericIndex) => {
      if (model.sheet.columnMeta[columnId] && model.sheet.columnMeta[columnId].size) {
        acc.grid[numericIndex] = {
          size: model.sheet.columnMeta[columnId].size,
          resizeable: true,
        };
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
        acc.grid[numericIndex] = {
          size: model.sheet.rowMeta[rowId].size,
          resizeable: true,
        };
      }
      return acc;
    },
    { grid: {} },
  );
};

const projectCellProps = (model: SheetModel, col: number, row: number): DxGridCellValue => {
  const address = { col, row };
  const rawValue = model.getValue(address);
  const ranges = model.sheet.ranges?.filter(({ range }) => inRange(rangeFromIndex(model.sheet, range), address));
  const threadRefs = undefined;
  // TODO(wittjosiah): Update this to get threads via relations.
  // model.sheet.threads
  //   ?.filter((thread) => {
  //     const range = thread.target?.anchor && parseThreadAnchorAsCellRange(thread.target!.anchor);
  //     return thread && range ? inRange(range, address) : false;
  //   })
  //   .map((thread) => Obj.getDXN(thread!).toString())
  //   .join(' ');

  const description = model.getValueDescription(address);
  const type = description?.type;
  const format = description?.format;
  const classNames = ranges?.map(cellClassNameForRange).reverse();

  return {
    value: parseValue({ type, format, value: rawValue }),
    className: mx(cellClassesForFieldType({ type, format }), threadRefs && commentedClassName, classNames),
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
  className: '!bg-toolbarSurface text-subdued text-end pie-1',
  resizeHandle: 'row',
});

export const colLabelCell = (col: number) => ({
  value: colToA1Notation(col),
  className: '!bg-toolbarSurface text-subdued',
  resizeHandle: 'col',
});

const cellGetter = (model: SheetModel) => {
  const getGridCells = gridCellGetter(model);
  return (nextBounds: DxGridPlaneRange, plane: DxGridPlane): DxGridPlaneCells => {
    switch (plane) {
      case 'grid':
        return getGridCells(nextBounds);
      case 'fixedStartStart': {
        return {
          '0,0': { className: '!bg-toolbarSurface' },
        };
      }
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
  dxGrid: DxGridElement | null,
  model: SheetModel,
): Pick<GridContentProps, 'columns' | 'rows'> => {
  const [columns, setColumns] = useState<DxGridAxisMeta>(createDxGridColumns(model));
  const [rows, setRows] = useState<DxGridAxisMeta>(createDxGridRows(model));

  useEffect(() => {
    const cellsAccessor = createDocAccessor(model.sheet, ['cells']);
    if (dxGrid) {
      dxGrid.getCells = cellGetter(model);
    }
    const handleCellsUpdate = () => {
      dxGrid?.requestUpdate('initialCells');
    };
    cellsAccessor.handle.addListener('change', handleCellsUpdate);
    const unsubscribe = model.graph.update.on(handleCellsUpdate);
    return () => {
      cellsAccessor.handle.removeListener('change', handleCellsUpdate);
      unsubscribe();
    };
  }, [model, dxGrid]);

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
  }, [model, dxGrid]);

  return { columns, rows };
};
