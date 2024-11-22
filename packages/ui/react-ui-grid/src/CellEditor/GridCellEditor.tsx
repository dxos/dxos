//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { CellEditor, type CellEditorProps } from './CellEditor';
import { type GridScopedProps, useGridContext } from '../Grid';

export type GridCellEditorProps = GridScopedProps<
  Pick<CellEditorProps, 'extension' | 'onBlur'> & { getCellContent: (index: string) => string | undefined }
>;

export const GridCellEditor = ({ extension, getCellContent, onBlur, __gridScope }: GridCellEditorProps) => {
  const { id, editing, setEditing, editBox } = useGridContext('GridSheetCellEditor', __gridScope);

  const handleBlur = useCallback(
    (value?: string) => {
      setEditing(null);
      onBlur?.(value);
    },
    [onBlur],
  );

  return editing ? (
    <CellEditor
      value={editing.initialContent ?? getCellContent(editing.index)}
      autoFocus
      box={editBox}
      onBlur={handleBlur}
      extension={extension}
      gridId={id}
    />
  ) : null;
};
