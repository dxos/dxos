//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import {
  type DxGridElement,
  Grid,
  type GridContentProps,
  type GridScopedProps,
  useGridContext,
  editorKeys,
  type EditorKeysProps,
  GridCellEditor,
} from '@dxos/react-ui-grid';

import { colLabelCell, dxGridCellIndexToSheetCellAddress, rowLabelCell, useSheetModelDxGridProps } from './util';
import { rangeToA1Notation, type CellRange } from '../../defs';
import { rangeExtension, sheetExtension, type CellRangeNotifier } from '../../extensions';
import { useSheetContext } from '../SheetContext';

const initialCells = {
  grid: {},
  frozenColsStart: [...Array(64)].reduce((acc, _, i) => {
    acc[`0,${i}`] = rowLabelCell(i);
    return acc;
  }, {}),
  frozenRowsStart: [...Array(12)].reduce((acc, _, i) => {
    acc[`${i},0`] = colLabelCell(i);
    return acc;
  }, {}),
};

const frozen = {
  frozenColsStart: 1,
  frozenRowsStart: 1,
};

const sheetRowDefault = { grid: { size: 32, resizeable: true } };
const sheetColDefault = { frozenColsStart: { size: 48 }, grid: { size: 180, resizeable: true } };

export const GridSheet = ({ __gridScope }: GridScopedProps<{}>) => {
  const { model, formatting } = useSheetContext();
  const { editing, setEditing } = useGridContext('GridSheetCellEditor', __gridScope);
  const dxGrid = useRef<DxGridElement | null>(null);
  const rangeNotifier = useRef<CellRangeNotifier>();

  // TODO(burdon): Validate formula before closing: hf.validateFormula();
  const handleClose = useCallback<NonNullable<EditorKeysProps['onClose']> | NonNullable<EditorKeysProps['onNav']>>(
    (value, { key, shift }) => {
      if (value !== undefined) {
        model.setValue(dxGridCellIndexToSheetCellAddress(editing!.index), value);
      }
      setEditing(null);
      const axis = ['Enter', 'ArrowUp', 'ArrowDown'].includes(key)
        ? 'row'
        : ['Tab', 'ArrowLeft', 'ArrowRight'].includes(key)
          ? 'col'
          : undefined;
      const delta = key.startsWith('Arrow') ? (['ArrowUp', 'ArrowLeft'].includes(key) ? -1 : 1) : shift ? -1 : 1;
      dxGrid.current?.refocus(axis, delta);
    },
    [model, editing, setEditing],
  );

  const handleAxisResize = useCallback<NonNullable<GridContentProps['onAxisResize']>>(
    ({ axis, size, index: numericIndex }) => {
      if (axis === 'row') {
        const rowId = model.sheet.rows[parseInt(numericIndex)];
        model.sheet.rowMeta[rowId] ??= {};
        model.sheet.rowMeta[rowId].size = size;
      } else {
        const columnId = model.sheet.columns[parseInt(numericIndex)];
        model.sheet.columnMeta[columnId] ??= {};
        model.sheet.columnMeta[columnId].size = size;
      }
    },
    [model],
  );

  const handleSelect = useCallback<NonNullable<GridContentProps['onSelect']>>(
    ({ minCol, maxCol, minRow, maxRow }) => {
      if (editing) {
        const range: CellRange = { from: { col: minCol, row: minRow } };
        if (minCol !== maxCol || minRow !== maxRow) {
          range.to = { col: maxCol, row: maxRow };
        }
        // Update range selection in formula.
        rangeNotifier.current?.(rangeToA1Notation(range));
      }
    },
    [editing],
  );

  const { columns, rows } = useSheetModelDxGridProps(dxGrid, model, formatting);

  const extension = useMemo(
    () => [
      editorKeys({ onClose: handleClose, ...(editing?.initialContent && { onNav: handleClose }) }),
      sheetExtension({ functions: model.graph.getFunctions() }),
      rangeExtension((fn) => (rangeNotifier.current = fn)),
    ],
    [model, handleClose, editing],
  );

  const getCellContent = useCallback(
    (index: string) => {
      const cell = dxGridCellIndexToSheetCellAddress(index);
      return model.getCellText(cell);
    },
    [model],
  );

  return (
    <>
      <GridCellEditor getCellContent={getCellContent} extension={extension} />
      <Grid.Content
        initialCells={initialCells}
        columns={columns}
        rows={rows}
        onAxisResize={handleAxisResize}
        onSelect={handleSelect}
        rowDefault={sheetRowDefault}
        columnDefault={sheetColDefault}
        frozen={frozen}
        ref={dxGrid}
      />
    </>
  );
};
