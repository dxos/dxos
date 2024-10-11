//
// Copyright 2024 DXOS.org
//

import React, { type Ref, useCallback, useRef } from 'react';

import {
  type DxGridElement,
  editorKeys,
  type EditorKeysProps,
  Grid,
  GridCellEditor,
  type GridScopedProps,
  useGridContext,
} from '@dxos/react-ui-grid';

import { useTable } from '../hooks';
import { type ColumnDefinition } from '../table';
import { DxAxisResize } from 'packages/ui/lit-grid/src';

const TableCellEditor = ({
  __gridScope,
  getCellData,
  setCellData,
}: GridScopedProps<{
  gridRef: Ref<DxGridElement>;
  getCellData: (colIndex: number, rowIndex: number) => any;
  setCellData: (colIndex: number, rowIndex: number, value: any) => void;
}>) => {
  const { editing, setEditing } = useGridContext('GridSheetCellEditor', __gridScope);
  const dxGrid = useRef<DxGridElement | null>(null);

  const handleClose = useCallback<NonNullable<EditorKeysProps['onClose']> | NonNullable<EditorKeysProps['onNav']>>(
    (value, { key, shift }) => {
      if (value !== undefined && editing) {
        const [col, row] = editing.index.split(',').map(Number);
        setCellData(col, row, value);
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
    [editing, setEditing, setCellData],
  );

  const extension = [editorKeys({ onClose: handleClose, ...(editing?.initialContent && { onNav: handleClose }) })];

  const getCellContent = useCallback(() => {
    if (editing) {
      const [col, row] = editing.index.split(',').map(Number);
      return `${getCellData(col, row)}`;
    }
  }, [editing, getCellData]);

  return <GridCellEditor extension={extension} getCellContent={getCellContent} />;
};

type TableProps = {
  columnDefinitions: ColumnDefinition[];
  data: any[];
};

const frozen = { frozenRowsStart: 1 };

// NOTE: The table model manages both ephemeral and persistent state.
// - Ephemeral state (e.g., sorting, filtering, selection) is handled internally.
// - Persistent state (e.g., column order, widths) is propagated to the parent for storage.

// TODO(Zan): Callback for changing column width.
// TODO(Zan): Callback for re-arranging columns.
// TODO(Zan): Callbacks for editing column schema.
// TODO(Zan): Remove column axis labels.
// TODO(Zan): Custom header labels and buttons.
export const Table = ({ columnDefinitions, data }: TableProps) => {
  const gridRef = useRef<DxGridElement>(null);
  const { table, columnMeta, dispatch } = useTable(columnDefinitions, data, gridRef);

  const handleAxisResize = useCallback(
    (event: DxAxisResize) => {
      if (event.axis === 'col') {
        const columnIndex = parseInt(event.index, 10);
        dispatch({ type: 'ModifyColumnWidth', columnIndex, width: event.size });
      }
    },
    [dispatch],
  );

  return (
    <Grid.Root id='table-next'>
      <TableCellEditor getCellData={table.getCellData} setCellData={table.setCellData} gridRef={gridRef} />
      <Grid.Content
        ref={gridRef}
        limitRows={data.length}
        limitColumns={table.columnDefinitions.length}
        initialCells={table.cells.value}
        columns={columnMeta}
        frozen={frozen}
        onAxisResize={handleAxisResize}
      />
    </Grid.Root>
  );
};
