//
// Copyright 2024 DXOS.org
//

import React, { type RefObject, useCallback } from 'react';

import {
  type DxGridElement,
  type EditorKeysProps,
  type EditorKeyEvent,
  GridCellEditor,
  type GridScopedProps,
  editorKeys,
  useGridContext,
} from '@dxos/react-ui-grid';

import { type TableModel } from '../../model';
import { toGridCell } from '../../types';

export type TableCellEditor = GridScopedProps<{
  gridRef: RefObject<DxGridElement>;
  tableModel?: TableModel;
}>;

export const TableCellEditor = ({ __gridScope, gridRef, tableModel }: TableCellEditor) => {
  const { editing, setEditing } = useGridContext('GridSheetCellEditor', __gridScope);
  const updateCell = useCallback(
    (value: any) => {
      if (value !== undefined && editing && tableModel) {
        tableModel.setCellData(toGridCell(editing.index), value);
      }
    },
    [editing, tableModel],
  );

  const determineNavigationAxis = ({ key }: EditorKeyEvent): 'row' | 'col' | undefined => {
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

    return shift ? -1 : 1; // TODO(burdon): ???
  };

  const handleClose = useCallback<NonNullable<EditorKeysProps['onClose']> | NonNullable<EditorKeysProps['onNav']>>(
    (value, event) => {
      updateCell(value);
      gridRef.current?.refocus(determineNavigationAxis(event), determineNavigationDelta(event));
      setEditing(null);
    },
    [updateCell, setEditing, determineNavigationAxis, determineNavigationDelta],
  );

  const extension = [editorKeys({ onClose: handleClose, ...(editing?.initialContent && { onNav: handleClose }) })];

  const getCellContent = useCallback(() => {
    if (editing && tableModel) {
      // TODO(Zan): Coercing to empty string on null/undefined values is temporary util we deeply integrate with fields.
      return tableModel.getCellData(toGridCell(editing.index)) ?? '';
    }
  }, [editing, tableModel]);

  return <GridCellEditor extension={extension} getCellContent={getCellContent} />;
};
