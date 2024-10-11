//
// Copyright 2024 DXOS.org
//

import React, { type RefObject, useCallback, useRef } from 'react';

import {
  type DxGridElement,
  type DxAxisResize,
  editorKeys,
  type EditorKeysProps,
  Grid,
  GridCellEditor,
  type GridScopedProps,
  useGridContext,
} from '@dxos/react-ui-grid';

import { useTable } from '../hooks';
import { type ColumnDefinition } from '../table';

const TableCellEditor = ({
  __gridScope,
  getCellData,
  setCellData,
  gridRef,
}: GridScopedProps<{
  gridRef: RefObject<DxGridElement>;
  getCellData: (colIndex: number, rowIndex: number) => any;
  setCellData: (colIndex: number, rowIndex: number, value: any) => void;
}>) => {
  const { editing, setEditing } = useGridContext('GridSheetCellEditor', __gridScope);

  const updateCell = useCallback(
    (value: any) => {
      if (value !== undefined && editing) {
        const [col, row] = editing.index.split(',').map(Number);
        setCellData(col, row, value);
      }
    },
    [editing, setCellData],
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
