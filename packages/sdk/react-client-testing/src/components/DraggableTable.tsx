//
// Copyright 2022 DXOS.org
//

import {
  createTable,
  getCoreRowModel,
  useTableInstance
} from '@tanstack/react-table';
import React, { useState } from 'react';

import { DraggableContainer } from './DraggableContainer';
import { DroppableContainer } from './DroppableContainer';

type RowProps = {
  id: string
}

const table = createTable().setRowType<RowProps>();
// const table = createTable();

const getColumns = (cols: any[]) => cols.map(col => table.createDataColumn(col.accessor, {
  header: () => <span>{col.title}</span>,
  cell: (info: any) => info.getValue()
}));

const DEFAULT_COLUMN_WIDTH = '1fr';
const getGridCellSize = (columns: any[]) => columns.map(column => column.width ?? DEFAULT_COLUMN_WIDTH).join(' ');

interface DraggableTableProps {
  id: string
  rows: any[]
  columns: any[]
  title?: string
}

export const DraggableTable = ({
  id,
  rows: data,
  columns: defaultColumns,
  title
}: DraggableTableProps) => {
  const [columns] = useState(() => getColumns(defaultColumns));
  const instance = useTableInstance(table, {
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'scroll' }}>
      {title && <h5>{title}</h5>}
      <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
        {instance.getHeaderGroups().map(headerGroup => (
          <div key={headerGroup.id} style={{ display: 'grid', gridTemplateColumns: getGridCellSize(defaultColumns) }}>
            {headerGroup.headers.map(header => (
              <div
                key={header.id}
                style={{ padding: 8 }}
              >
                {header.isPlaceholder ? null : header.renderHeader()}
              </div>
            ))}
          </div>
        ))}
      </div>
      <DroppableContainer
        id={id}
        styles={{
          height: '100%',
          marginTop: '4px',
          padding: '4px 8px 8px 8px'
        }}
      >
        {instance.getRowModel().rows.map((row, i) => (
          <DraggableContainer
            key={row.original!.id}
            id={row.original!.id}
            index={i}
          >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: getGridCellSize(defaultColumns)
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <div
                    key={cell.id}
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      padding: 8
                    }}
                  >
                    {cell.renderCell()}
                  </div>
                ))}
              </div>
          </DraggableContainer>
        ))}
      </DroppableContainer>
    </div>
  );
};
