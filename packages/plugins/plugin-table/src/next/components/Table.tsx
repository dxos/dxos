//
// Copyright 2024 DXOS.org
//

import React, { useRef } from 'react';

import { type DxGridElement, Grid } from '@dxos/react-ui-grid';

import { useTable } from '../hooks';
import { type ColumnDefinition } from '../table';

type TableComponentProps = {
  columnDefinitions: ColumnDefinition[];
  data: any[];
};

export const TableComponent: React.FC<TableComponentProps> = ({ columnDefinitions, data }) => {
  const gridRef = useRef<DxGridElement>(null);
  const { table, columnMeta, gridCells, dispatch } = useTable(columnDefinitions, data, gridRef);

  return (
    <Grid.Root id='table-v2'>
      <Grid.Content
        ref={gridRef}
        limitRows={table.rowCount.value}
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
