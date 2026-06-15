//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { inRange, isFormula } from '@dxos/compute-hyperformula';
import { createDocAccessor, getObjectOnBranch } from '@dxos/echo-client';
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

import { Sheet, cellClassNameForRange, mapFormulaIndicesToRefs, rangeFromIndex } from '#types';

import { type SheetModel } from '../../model';

/** Whether a cell, on accepting the branch diff, would adopt the compare value ('add') or be cleared ('remove'). */
export type CellDiffKind = 'add' | 'remove';

/** A changed cell: how an accept resolves it, plus the compare branch's incoming value (for 'add'). */
export type SheetCellDiffEntry = { kind: CellDiffKind; value?: Sheet.CellValue['value'] };

/** Map of changed cell index keys (`colId@rowId`) to their diff entry. */
export type SheetCellDiff = Map<string, SheetCellDiffEntry>;

// Shared diff palette (defined with the CodeMirror diff tokens): the compare branch's value (what an
// accept adds) is green; the current branch's deviation (what an accept removes) is red.
const diffClassName: Record<CellDiffKind, string> = {
  add: '!bg-cm-diff-add-surface',
  remove: '!bg-cm-diff-remove-surface',
};

/**
 * Compute the per-cell diff of the sheet's current branch against `compareBranch`, oriented as a
 * preview of accepting the compare branch in: cells the compare branch changed/added are 'add', cells
 * present only in the current branch are 'remove'. The compare side is read once (a snapshot); the
 * diff recomputes as the current branch is edited. Empty when no comparison is active.
 */
export const useSheetBranchDiff = (model: SheetModel, compareBranch?: string): SheetCellDiff => {
  const [compareCells, setCompareCells] = useState<Record<string, Sheet.CellValue>>();

  useEffect(() => {
    if (!compareBranch) {
      setCompareCells(undefined);
      return;
    }

    let cancelled = false;
    // Branch data is untyped (decoded record); the cells map is keyed by `colId@rowId`.
    void getObjectOnBranch(model.sheet, compareBranch).then((data) => {
      if (!cancelled) {
        setCompareCells((data?.cells ?? {}) as Record<string, Sheet.CellValue>);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [model, compareBranch]);

  // Recompute the diff as the current branch's cells change (the compare side stays a snapshot).
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!compareCells) {
      return;
    }
    const accessor = createDocAccessor(model.sheet, ['cells']);
    const handleChange = () => setRevision((value) => value + 1);
    accessor.handle.addListener('change', handleChange);
    return () => accessor.handle.removeListener('change', handleChange);
  }, [model, compareCells]);

  return useMemo(() => {
    const diff: SheetCellDiff = new Map();
    if (!compareCells) {
      return diff;
    }
    const current = model.sheet.cells;
    for (const key of new Set([...Object.keys(current), ...Object.keys(compareCells)])) {
      const currentValue = current[key]?.value;
      const compareValue = compareCells[key]?.value;
      if (currentValue !== compareValue) {
        diff.set(key, compareValue === undefined ? { kind: 'remove' } : { kind: 'add', value: compareValue });
      }
    }
    return diff;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, compareCells, revision]);
};

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

const projectCellProps = (model: SheetModel, col: number, row: number, diffCells?: SheetCellDiff): DxGridCellValue => {
  const address = { col, row };
  const rawValue = model.getValue(address);
  const ranges = model.sheet.ranges?.filter(({ range }) => inRange(rangeFromIndex(model.sheet, range), address));
  const threadRefs = undefined;
  const columnId = model.sheet.columns[col];
  const rowId = model.sheet.rows[row];
  const diffEntry = columnId && rowId ? diffCells?.get(`${columnId}@${rowId}`) : undefined;
  // TODO(wittjosiah): Update this to get threads via relations.
  // model.sheet.threads
  //   ?.filter((thread) => {
  //     const range = thread.target?.anchor && parseThreadAnchorAsCellRange(thread.target!.anchor);
  //     return thread && range ? inRange(range, address) : false;
  //   })
  //   .map((thread) => Obj.getURI(thread!))
  //   .join(' ');

  const description = model.getValueDescription(address);
  const type = description?.type;
  const format = description?.format;
  const classNames = ranges?.map(cellClassNameForRange).reverse();

  // In a diff, an added/changed cell previews the compare branch's incoming value; a removed cell
  // keeps the current value. The compare value is the raw stored input — show formulas in A1 form
  // (current cells show their computed value, which is never a formula string).
  const cellValue = diffEntry?.kind === 'add' ? diffEntry.value : rawValue;
  const value =
    typeof cellValue === 'string' && isFormula(cellValue)
      ? mapFormulaIndicesToRefs(model.sheet, cellValue)
      : parseValue({ type, format, value: cellValue });

  return {
    value,
    className: mx(
      cellClassesForFieldType({ type, format }),
      threadRefs && commentedClassName,
      classNames,
      diffEntry && diffClassName[diffEntry.kind],
    ),
    dataRefs: threadRefs,
    // Block cell editing while the model is read-only (e.g. time-traveling).
    ...(model.readonly ? { readonly: true } : undefined),
  };
};
const gridCellGetter = (model: SheetModel, diffCells?: SheetCellDiff) => {
  // TODO(thure): Actually use the cache.
  const cachedGridCells: DxGridPlaneCells = {};
  return (nextBounds: DxGridPlaneRange): DxGridPlaneCells => {
    [...Array(nextBounds.end.col - nextBounds.start.col)].forEach((_, c0) => {
      return [...Array(nextBounds.end.row - nextBounds.start.row)].forEach((_, r0) => {
        const col = nextBounds.start.col + c0;
        const row = nextBounds.start.row + r0;
        cachedGridCells[`${col},${row}`] = projectCellProps(model, col, row, diffCells);
      });
    });
    return cachedGridCells;
  };
};

export const rowLabelCell = (row: number) => ({
  value: rowToA1Notation(row),
  className: 'bg-axis-surface! text-axis-text text-end pe-1',
  resizeHandle: 'row',
});

export const colLabelCell = (col: number) => ({
  value: colToA1Notation(col),
  className: 'bg-axis-surface! text-axis-text',
  resizeHandle: 'col',
});

const cellGetter = (model: SheetModel, diffCells?: SheetCellDiff) => {
  const getGridCells = gridCellGetter(model, diffCells);
  return (nextBounds: DxGridPlaneRange, plane: DxGridPlane): DxGridPlaneCells => {
    switch (plane) {
      case 'grid':
        return getGridCells(nextBounds);
      case 'fixedStartStart': {
        return {
          '0,0': { className: 'bg-axis-surface!' },
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
  diffCells?: SheetCellDiff,
): Pick<GridContentProps, 'columns' | 'rows'> => {
  const [columns, setColumns] = useState<DxGridAxisMeta>(createDxGridColumns(model));
  const [rows, setRows] = useState<DxGridAxisMeta>(createDxGridRows(model));

  useEffect(() => {
    const cellsAccessor = createDocAccessor(model.sheet, ['cells']);
    if (dxGrid) {
      dxGrid.getCells = cellGetter(model, diffCells);
      // Re-render cells so the diff highlight applies when the comparison changes.
      dxGrid.requestUpdate('initialCells');
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
  }, [model, dxGrid, diffCells]);

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
