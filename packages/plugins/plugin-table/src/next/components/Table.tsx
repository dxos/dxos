//
// Copyright 2024 DXOS.org
//

import React, { useRef } from 'react';

import { type DxGridElement, Grid } from '@dxos/react-ui-grid';

import { useTable } from '../hooks';
import { type ColumnDefinition } from '../table';

type TableProps = {
  columnDefinitions: ColumnDefinition[];
  data: any[];
};

// NOTE: The table model manages both ephemeral and persistent state.
// - Ephemeral state (e.g., sorting, filtering, selection) is handled internally.
// - Persistent state (e.g., column order, widths) is propagated to the parent for storage.

// TODO(Zan): Callback for changing column width.
// TODO(Zan): Callback for re-arranging columns.
// TODO(Zan): Callbacks for editing column schema.
// TODO(Zan): Remove column axis labels.
// TODO(Zan): Custom header labels and buttons.
export const Table: React.FC<TableProps> = ({ columnDefinitions, data }) => {
  const gridRef = useRef<DxGridElement>(null);
  const { table, columnMeta, gridCells, dispatch } = useTable(columnDefinitions, data, gridRef);

  return (
    <Grid.Root id='table-v2'>
      <Grid.Content
        ref={gridRef}
        limitRows={data.length}
        limitColumns={table.columnDefinitions.length}
        initialCells={gridCells}
        columnDefault={{ size: 120, resizeable: true }}
        rowDefault={{ size: 32, resizeable: true }}
        columns={columnMeta}
        onAxisResize={(event) => {
          if (event.axis === 'col') {
            const columnIndex = parseInt(event.index, 10);
            dispatch({
              type: 'ModifyColumnWidth',
              columnIndex,
              width: event.size,
            });
          }
        }}
      />
    </Grid.Root>
  );
};
