//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { type DxGridElement, type DxAxisResize, Grid } from '@dxos/react-ui-grid';

import { TableCellEditor } from './TableCellEditor';
import { useTableModel } from '../hooks';
import { type TableType } from '../types';

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

  const handleOnCellUpdate = useCallback((col: number, row: number) => {
    gridRef.current?.updateIfWithinBounds({ col, row });
  }, []);

  const tableModel = useTableModel(table, data, handleOnCellUpdate);
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
        limitColumns={table.view?.fields?.length ?? 0}
        initialCells={tableModel?.cells.value}
        columns={tableModel?.columnMeta.value}
        frozen={frozen}
        onAxisResize={handleAxisResize}
      />
    </Grid.Root>
  );
};
