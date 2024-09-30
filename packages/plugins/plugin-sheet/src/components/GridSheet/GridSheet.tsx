//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import { Grid, useGridContext, type GridScopedProps } from '@dxos/react-ui-grid';
import { type DxGridElement, type GridContentProps } from '@dxos/react-ui-grid/src';

import { dxGridCellIndexToSheetCellAddress, useSheetModelDxGridProps } from './util';
import { type SheetModel, type FormattingModel } from '../../model';
import { CellEditor, editorKeys, type EditorKeysProps, sheetExtension } from '../CellEditor';
import { useSheetModel, type UseSheetModelProps } from '../Sheet/util';

const GridSheetCellEditor = ({
  onNav,
  onClose,
  model,
  __gridScope,
}: GridScopedProps<EditorKeysProps & { model: SheetModel }>) => {
  const { id, editing, setEditing, editBox, initialEditContent } = useGridContext('GridSheetCellEditor', __gridScope);
  const cell = dxGridCellIndexToSheetCellAddress(editing);

  const extension = useMemo(
    () => [editorKeys({ onNav, onClose }), sheetExtension({ functions: model.functions })],
    [model, onNav, onClose],
  );

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

  const { cells, columns, rows } = useSheetModelDxGridProps(model, formatting);

  return (
    <>
      <GridSheetCellEditor model={model} onClose={handleClose} />
      <Grid.Content
        cells={cells}
        columns={columns}
        rows={rows}
        onAxisResize={handleAxisResize}
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
