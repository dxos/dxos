//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { type DxGridCellIndex, useGridContext } from '../Grid';
import { CellEditor, type CellEditorProps } from './CellEditor';

export type GridCellEditorProps = Pick<CellEditorProps, 'extensions' | 'onBlur' | 'slots'> & {
  getCellContent: (index: DxGridCellIndex) => string | undefined;
};

export const GridCellEditor = ({ extensions, getCellContent, onBlur, slots }: GridCellEditorProps) => {
  const { id, editing, setEditing, editBox } = useGridContext('GridCellEditor');

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
      extensions={extensions}
      gridId={id}
      slots={slots}
    />
  ) : null;
};
