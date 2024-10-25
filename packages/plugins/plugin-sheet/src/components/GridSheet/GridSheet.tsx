//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useRef, type FocusEvent, type WheelEvent, type KeyboardEvent } from 'react';

import { useAttention } from '@dxos/react-ui-attention';
import {
  type DxGridElement,
  Grid,
  type GridContentProps,
  editorKeys,
  type EditorKeysProps,
  GridCellEditor,
  closestCell,
} from '@dxos/react-ui-grid';

import { colLabelCell, dxGridCellIndexToSheetCellAddress, rowLabelCell, useSheetModelDxGridProps } from './util';
import { rangeToA1Notation, type CellRange, DEFAULT_COLUMNS, DEFAULT_ROWS } from '../../defs';
import { rangeExtension, sheetExtension, type CellRangeNotifier } from '../../extensions';
import { useSelectThreadOnCellFocus, useUpdateFocusedCellOnThreadSelection } from '../../integrations';
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

const sheetRowDefault = { frozenRowsStart: { size: 32, readonly: true }, grid: { size: 32, resizeable: true } };
const sheetColDefault = { frozenColsStart: { size: 48, readonly: true }, grid: { size: 180, resizeable: true } };

export const GridSheet = () => {
  const { id, model, editing, setEditing, setCursor, setRange, cursor, cursorFallbackRange, activeRefs } =
    useSheetContext();
  const dxGrid = useRef<DxGridElement | null>(null);
  const rangeNotifier = useRef<CellRangeNotifier>();
  const { hasAttention } = useAttention(id);

  const handleFocus = useCallback(
    (event: FocusEvent) => {
      if (!editing) {
        const cell = closestCell(event.target);
        if (cell && cell.plane === 'grid') {
          setCursor({ col: cell.col, row: cell.row });
        }
      }
    },
    [editing],
  );

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
      const range: CellRange = { from: { col: minCol, row: minRow } };
      if (minCol !== maxCol || minRow !== maxRow) {
        range.to = { col: maxCol, row: maxRow };
      }
      if (editing) {
        // Update range selection in formula.
        rangeNotifier.current?.(rangeToA1Notation(range));
      } else {
        // Setting range while editing causes focus to move to null, avoid doing so.
        setRange(range.to ? range : undefined);
      }
    },
    [editing],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!hasAttention) {
        event.stopPropagation();
      }
    },
    [hasAttention],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Backspace':
        case 'Delete':
          event.preventDefault();
          return cursorFallbackRange && model.clear(cursorFallbackRange);
      }
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 'x':
          case 'X':
            event.preventDefault();
            return cursorFallbackRange && model.cut(cursorFallbackRange);
          case 'c':
          case 'C':
            event.preventDefault();
            return cursorFallbackRange && model.copy(cursorFallbackRange);
          case 'v':
          case 'V':
            event.preventDefault();
            return cursor && model.paste(cursor);
          case 'z':
            event.preventDefault();
            return event.shiftKey ? model.redo() : model.undo();
          case 'Z':
          case 'y':
            event.preventDefault();
            return model.redo();
        }
      }
    },
    [cursorFallbackRange, model, cursor],
  );

  const { columns, rows } = useSheetModelDxGridProps(dxGrid, model);

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

  useUpdateFocusedCellOnThreadSelection(dxGrid);
  useSelectThreadOnCellFocus();

  return (
    <>
      <GridCellEditor getCellContent={getCellContent} extension={extension} />
      <Grid.Content
        initialCells={initialCells}
        limitColumns={DEFAULT_COLUMNS}
        limitRows={DEFAULT_ROWS}
        columns={columns}
        rows={rows}
        onAxisResize={handleAxisResize}
        onSelect={handleSelect}
        rowDefault={sheetRowDefault}
        columnDefault={sheetColDefault}
        frozen={frozen}
        onFocus={handleFocus}
        onWheelCapture={handleWheel}
        onKeyDown={handleKeyDown}
        overscroll='inline'
        className='[--dx-grid-base:var(--surface-bg)]'
        activeRefs={activeRefs}
        ref={dxGrid}
      />
    </>
  );
};
