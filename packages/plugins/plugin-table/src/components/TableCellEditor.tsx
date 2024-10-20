//
// Copyright 2024 DXOS.org
//

import React, { type RefObject, useCallback } from 'react';

import {
  type DxGridElement,
  editorKeys,
  type EditorKeysProps,
  GridCellEditor,
  type GridScopedProps,
  useGridContext,
} from '@dxos/react-ui-grid';

import { type TableModel } from '../table-model';
import { cellKeyToCoords } from '../util/coords';

export const TableCellEditor = ({
  __gridScope,
  gridRef,
  tableModel,
}: GridScopedProps<{
  gridRef: RefObject<DxGridElement>;
  tableModel?: TableModel;
}>) => {
  const { editing, setEditing } = useGridContext('GridSheetCellEditor', __gridScope);

  const updateCell = useCallback(
    (value: any) => {
      if (value !== undefined && editing && tableModel) {
        const { col, row } = cellKeyToCoords(editing.index);
        tableModel.setCellData(col, row, value);
      }
    },
    [editing, tableModel],
  );

  const determineNavigationAxis = (key: string): 'row' | 'col' | undefined => {
    if (['Enter', 'ArrowUp', 'ArrowDown'].includes(key)) {
      return 'row';
    }
    if (['Tab', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      return 'col';
    }
    return undefined;
  };

  const determineNavigationDelta = (key: string, shift?: boolean): -1 | 1 => {
    if (key.startsWith('Arrow')) {
      return ['ArrowUp', 'ArrowLeft'].includes(key) ? -1 : 1;
    }
    return shift ? -1 : 1;
  };

  const handleClose = useCallback<NonNullable<EditorKeysProps['onClose']> | NonNullable<EditorKeysProps['onNav']>>(
    (value, { key, shift }) => {
      updateCell(value);
      setEditing(null);

      const axis = determineNavigationAxis(key);
      const delta = determineNavigationDelta(key, shift);

      gridRef.current?.refocus(axis, delta);
    },
    [updateCell, setEditing, determineNavigationAxis, determineNavigationDelta],
  );

  const extension = [editorKeys({ onClose: handleClose, ...(editing?.initialContent && { onNav: handleClose }) })];

  const getCellContent = useCallback(() => {
    if (editing && tableModel) {
      const [col, row] = editing.index.split(',').map(Number);

      // TODO(ZaymonFC): Coercing to empty string on null/undefined values is temporary util
      // we deeply integrate with fields.
      return `${tableModel.getCellData(col, row) ?? ''}`;
    }
  }, [editing, tableModel]);

  return <GridCellEditor extension={extension} getCellContent={getCellContent} />;
};
