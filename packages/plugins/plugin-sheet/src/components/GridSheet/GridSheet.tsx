//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import { Grid, useGridContext, type GridScopedProps } from '@dxos/react-ui-grid';
import { type DxGridElement, type GridContentProps } from '@dxos/react-ui-grid/src';

import { dxGridCellIndexToSheetCellAddress, useSheetModelDxGridProps } from './util';
import { type SheetModel, type FormattingModel, rangeToA1Notation, type CellRange } from '../../model';
import {
  CellEditor,
  type CellEditorProps,
  type CellRangeNotifier,
  editorKeys,
  type EditorKeysProps,
  rangeExtension,
  sheetExtension,
} from '../CellEditor';
import { useSheetModel, type UseSheetModelProps } from '../Sheet/util';

const GridSheetCellEditor = ({
  model,
  extension,
  __gridScope,
}: GridScopedProps<Pick<CellEditorProps, 'extension'> & { model: SheetModel }>) => {
  const { id, editing, setEditing, editBox, initialEditContent } = useGridContext('GridSheetCellEditor', __gridScope);
  const cell = dxGridCellIndexToSheetCellAddress(editing);

  return editing ? (
    <CellEditor
      variant='grid'
      value={initialEditContent ?? (cell ? model.getCellText(cell) : undefined)}
      autoFocus
      box={editBox}
      onBlur={() => setEditing(null)}
      extension={extension}
      gridId={id}
    />
  ) : null;
};

export type GridSheetProps = UseSheetModelProps;

const sheetRowDefault = { size: 32, resizeable: true };
const sheetColDefault = { size: 180, resizeable: true };

const GridSheetImpl = ({
  model,
  formatting,
  __gridScope,
}: GridScopedProps<{ model: SheetModel; formatting: FormattingModel }>) => {
  const { editing, setEditing } = useGridContext('GridSheetCellEditor', __gridScope);
  const dxGrid = useRef<DxGridElement | null>(null);
  const rangeNotifier = useRef<CellRangeNotifier>();

  // TODO(burdon): Validate formula before closing: hf.validateFormula();
  const handleClose = useCallback<EditorKeysProps['onClose']>(
    (value, { key, shift }) => {
      if (value !== undefined) {
        model.setValue(dxGridCellIndexToSheetCellAddress(editing)!, value);
      }
      setEditing(null);
      dxGrid.current?.refocus(key === 'Enter' ? 'row' : key === 'Tab' ? 'col' : undefined, shift ? -1 : 1);
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
        const range: CellRange = { from: { column: minCol, row: minRow } };
        if (minCol !== maxCol || minRow !== maxRow) {
          range.to = { column: maxCol, row: maxRow };
        }
        // Update range selection in formula.
        rangeNotifier.current?.(rangeToA1Notation(range));
      }
    },
    [editing],
  );

  const { cells, columns, rows } = useSheetModelDxGridProps(model, formatting);

  const extension = useMemo(
    () => [
      editorKeys({ onClose: handleClose }),
      sheetExtension({ functions: model.functions }),
      rangeExtension((fn) => (rangeNotifier.current = fn)),
    ],
    [model, handleClose],
  );

  return (
    <>
      <GridSheetCellEditor model={model} extension={extension} />
      <Grid.Content
        cells={cells}
        columns={columns}
        rows={rows}
        onAxisResize={handleAxisResize}
        onSelect={handleSelect}
        rowDefault={sheetRowDefault}
        columnDefault={sheetColDefault}
        ref={dxGrid}
      />
    </>
  );
};

export const GridSheet = (props: GridSheetProps) => {
  const { model, formatting } = useSheetModel(props);
  return !model || !formatting ? null : (
    <Grid.Root id={model.id}>
      <GridSheetImpl model={model} formatting={formatting} />
    </Grid.Root>
  );
};
