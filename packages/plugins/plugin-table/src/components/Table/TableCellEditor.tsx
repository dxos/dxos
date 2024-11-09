//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { invariant } from '@dxos/invariant';
import {
  type EditorKeysProps,
  type EditorKeyEvent,
  GridCellEditor,
  type GridScopedProps,
  editorKeys,
  useGridContext,
} from '@dxos/react-ui-grid';

import { type TableModel } from '../../model';
import { type GridCell, toGridCell } from '../../types';

export type TableCellEditor = GridScopedProps<{
  model?: TableModel;
  onEnter?: (cell: GridCell) => void;
  onFocus?: (increment: 'col' | 'row' | undefined, delta: 0 | 1 | -1 | undefined) => void;
}>;

export const TableCellEditor = ({ __gridScope, model, onEnter, onFocus }: TableCellEditor) => {
  const { editing, setEditing } = useGridContext('GridSheetCellEditor', __gridScope);

  const determineNavigationAxis = ({ key }: EditorKeyEvent): 'col' | 'row' | undefined => {
    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'Enter': {
        return 'row';
      }

      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Tab':
        return 'col';

      default:
        return undefined;
    }
  };

  const determineNavigationDelta = ({ key, shift }: EditorKeyEvent): -1 | 1 => {
    switch (key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        return -1;

      case 'ArrowDown':
      case 'ArrowRight':
        return 1;
    }

    return shift ? -1 : 1;
  };

  const updateCell = useCallback(
    (value: string | undefined) => {
      if (value !== undefined && editing && model) {
        model.setCellData(toGridCell(editing.index), value);
      }
    },
    [model, editing],
  );

  const handleClose = useCallback<NonNullable<EditorKeysProps['onClose']> | NonNullable<EditorKeysProps['onNav']>>(
    (value, event) => {
      updateCell(value);
      onFocus?.(determineNavigationAxis(event), determineNavigationDelta(event));
      invariant(editing);
      const cell = toGridCell(editing.index);
      setEditing(null);
      onEnter?.(cell);
    },
    [editing, setEditing, updateCell, determineNavigationAxis, determineNavigationDelta],
  );

  const extension = useMemo(() => {
    // TODO(burdon): Add autocomplete extension for references, enums, etc. based on type.
    return [
      editorKeys({
        onClose: handleClose,
        ...(editing?.initialContent && { onNav: handleClose }),
      }),
    ];
  }, [model, editing, handleClose]);

  const getCellContent = useCallback(() => {
    if (model && editing) {
      const value = model.getCellData(toGridCell(editing.index));
      return value !== undefined ? String(value) : '';
    }
  }, [model, editing]);

  return <GridCellEditor extension={extension} getCellContent={getCellContent} />;
};
