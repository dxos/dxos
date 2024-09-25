//
// Copyright 2024 DXOS.org
//
import React, { useCallback, useMemo, useRef } from 'react';

import { Grid, useGridContext, type GridScopedProps } from '@dxos/react-ui-grid';
import { type DxGridElement } from '@dxos/react-ui-grid/src';

import { gridIndexToCellAddress } from './util';
import { type SheetModel } from '../../model';
import { CellEditor, editorKeys, type EditorKeysProps, sheetExtension } from '../CellEditor';
import { type FormattingModel } from '../Sheet/formatting';
import { useSheetModel, type UseSheetModelProps } from '../Sheet/util';

const GridSheetCellEditor = ({
  onNav,
  onClose,
  model,
  __gridScope,
}: GridScopedProps<EditorKeysProps & { model: SheetModel }>) => {
  const { id, editing, editBox, setEditing } = useGridContext('GridSheetCellEditor', __gridScope);

  const extension = useMemo(
    () => [editorKeys({ onNav, onClose }), sheetExtension({ functions: model.functions })],
    [model],
  );

  return editing ? (
    <CellEditor
      variant='grid'
      autoFocus
      box={editBox}
      onBlur={() => setEditing(null)}
      extension={extension}
      gridId={id}
    />
  ) : null;
};

export type GridSheetProps = UseSheetModelProps;

const GridSheetImpl = ({
  model,
  formatting,
  __gridScope,
}: GridScopedProps<{ model: SheetModel; formatting: FormattingModel }>) => {
  const { editing, setEditing } = useGridContext('GridSheetCellEditor', __gridScope);
  const cell = gridIndexToCellAddress(editing);
  const dxGrid = useRef<DxGridElement | null>(null);

  // TODO(burdon): Validate formula before closing: hf.validateFormula();
  const handleClose = useCallback<EditorKeysProps['onClose']>(
    (value) => {
      // initialText.current = undefined;
      // quickEdit.current = false;
      if (cell && value !== undefined) {
        model.setValue(cell, value);
        // Auto-advance to next cell.
        // const next = handleArrowNav({ key: 'ArrowDown', metaKey: false }, cursor, size);
        // if (next) {
        //   setCursor(next);
        // }
      }
      setEditing(null);
      dxGrid.current?.refocus();
    },
    [model, cell, setEditing],
  );

  // Quick entry mode: i.e., typing to enter cell.
  const handleNav = useCallback<NonNullable<EditorKeysProps['onNav']>>(
    (value, { key }) => {
      // initialText.current = undefined;
      if (cell) {
        model.setValue(cell, value ?? null);
        // const next = handleArrowNav({ key, metaKey: false }, cursor, size);
        // if (next) {
        //   setCursor(next);
        // }
      }
      setEditing(null);
      dxGrid.current?.refocus();
    },
    [model, cell, setEditing],
  );

  return (
    <>
      <GridSheetCellEditor model={model} onNav={handleNav} onClose={handleClose} />
      <Grid.Content ref={dxGrid} />
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
