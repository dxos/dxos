//
// Copyright 2024 DXOS.org
//

import React, { type FocusEvent, useCallback, useMemo, useRef } from 'react';

import { type DxGridElement, Grid, type GridContentProps, closestCell } from '@dxos/react-ui-grid';

import {
  useSelectThreadOnCellFocus,
  useThreadDecorations,
  useUpdateFocusedCellOnThreadSelection,
} from './hooks-threads';
import { colLabelCell, dxGridCellIndexToSheetCellAddress, rowLabelCell, useSheetModelDxGridProps } from './util';
import { rangeToA1Notation, type CellRange } from '../../defs';
import { type SheetModel, type FormattingModel } from '../../model';
import {
  CellEditor,
  type CellEditorProps,
  type CellRangeNotifier,
  editorKeys,
  type EditorKeysProps,
  rangeExtension,
  sheetExtension,
} from '../CellEditor';
import { useSheetContext } from '../SheetContext';

const GridSheetCellEditor = ({ model, extension }: Pick<CellEditorProps, 'extension'> & { model: SheetModel }) => {
  const { id, editing, setEditing, editBox } = useSheetContext();
  const cell = dxGridCellIndexToSheetCellAddress(editing);

  return editing ? (
    <CellEditor
      variant='grid'
      value={editing.initialContent ?? (cell ? model.getCellText(cell) : undefined)}
      autoFocus
      box={editBox}
      onBlur={() => setEditing(null)}
      extension={extension}
      gridId={id}
    />
  ) : null;
};

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

const GridSheetImpl = ({ model, formatting }: { model: SheetModel; formatting: FormattingModel }) => {
  const { editing, setEditing, setCursor, setRange } = useSheetContext();
  const dxGrid = useRef<DxGridElement | null>(null);
  const rangeNotifier = useRef<CellRangeNotifier>();

  useUpdateFocusedCellOnThreadSelection(model, dxGrid);
  useSelectThreadOnCellFocus(model);
  const decorations = useThreadDecorations(model);

  const handleFocus = useCallback((event: FocusEvent<DxGridElement>) => {
    setCursor(closestCell(event.target));
  }, []);

  // TODO(burdon): Validate formula before closing: hf.validateFormula();
  const handleClose = useCallback<NonNullable<EditorKeysProps['onClose']> | NonNullable<EditorKeysProps['onNav']>>(
    (value, { key, shift }) => {
      if (value !== undefined) {
        model.setValue(dxGridCellIndexToSheetCellAddress(editing)!, value);
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
        setRange(range);
        // Update range selection in formula.
        rangeNotifier.current?.(rangeToA1Notation(range));
      }
    },
    [editing],
  );

  const { columns, rows } = useSheetModelDxGridProps(dxGrid, model, formatting, decorations);

  const extension = useMemo(
    () => [
      editorKeys({ onClose: handleClose, ...(editing?.initialContent && { onNav: handleClose }) }),
      sheetExtension({ functions: model.graph.getFunctions() }),
      rangeExtension((fn) => (rangeNotifier.current = fn)),
    ],
    [model, handleClose, editing],
  );

  return (
    <>
      <GridSheetCellEditor model={model} extension={extension} />
      <Grid.Content
        initialCells={initialCells}
        columns={columns}
        rows={rows}
        onAxisResize={handleAxisResize}
        onSelect={handleSelect}
        onFocus={handleFocus}
        rowDefault={sheetRowDefault}
        columnDefault={sheetColDefault}
        frozen={frozen}
        ref={dxGrid}
      />
    </>
  );
};

export type GridSheetProps = {};

export const GridSheet = () => {
  const { model, formatting } = useSheetContext();

  if (!model || !formatting) {
    return null;
  }

  return <GridSheetImpl model={model} formatting={formatting} />;
};
