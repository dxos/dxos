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

import { type TableType } from '../../types';
import { useTableModel } from '../hooks';
import { type TableModel } from '../table-model';

const TableCellEditor = ({
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
        const [col, row] = editing.index.split(',').map(Number);
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
      return `${tableModel.getCellData(col, row)}`;
    }
  }, [editing, tableModel]);

  return <GridCellEditor extension={extension} getCellContent={getCellContent} />;
};

type TableProps = {
  table: TableType;
  data: any[];
};

const frozen = { frozenRowsStart: 1 };

// NOTE: The table model manages both ephemeral and persistent state.
// - Ephemeral state (e.g., sorting, filtering, selection) is handled internally.
// - Persistent state (e.g., column order, widths) is propagated to the parent for storage.

// TODO(Zan): Callback for changing column width.
// TODO(Zan): Callback for re-arranging columns.
// TODO(Zan): Callbacks for editing column schema.
export const Table = ({ table, data }: TableProps) => {
  const gridRef = useRef<DxGridElement>(null);
  const { tableModel } = useTableModel(table, data, gridRef);

  const handleAxisResize = useCallback(
    (event: DxAxisResize) => {
      if (event.axis === 'col') {
        const columnIndex = parseInt(event.index, 10);
        tableModel?.setColumnWidth(columnIndex, event.size);
      }
    },
    [tableModel],
  );

  return (
    <Grid.Root id='table-next'>
      <TableCellEditor tableModel={tableModel} gridRef={gridRef} />
      <Grid.Content
        ref={gridRef}
        limitRows={data.length}
        limitColumns={table.props.length}
        initialCells={tableModel?.cells.value}
        columns={tableModel?.columnMeta.value}
        frozen={frozen}
        onAxisResize={handleAxisResize}
      />
    </Grid.Root>
  );
};
