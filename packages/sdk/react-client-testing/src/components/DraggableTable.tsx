//
// Copyright 2022 DXOS.org
//

import {
  ColumnOrderState,
  createTable,
  getCoreRowModel,
  useTableInstance
} from '@tanstack/react-table';
import React, { useEffect, useState } from 'react';

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

const DEFAULT_COLUMN_WIDTH = '300px';
const getGridCellSize = (columns: any[]) => columns.map(column => column.width ?? DEFAULT_COLUMN_WIDTH).join(' ');

interface DraggableTableProps {
  id: string
  rows: any[]
  columns: any[]
  columnOrder?: string[]
  title?: string
}

export const DraggableTable = ({
  id,
  rows: data,
  columns: defaultColumns,
  columnOrder: order,
  title
}: DraggableTableProps) => {
  const [columns] = useState(() => getColumns(defaultColumns));
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);

  const instance = useTableInstance(table, {
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnOrder
    },
    onColumnOrderChange: setColumnOrder
  });

  useEffect(() => {
    instance.setColumnOrder(instance.getAllLeafColumns().sort((a, b) => {
      if (!order || !a.accessorKey || !b.accessorKey) {
        return 0;
      }
      if (order.indexOf(a.accessorKey) > order.indexOf(b.accessorKey)) {
        return 1;
      } else {
        return -1;
      }
    }).map(column => column.id));
  }, [order]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'scroll' }}>
      {title && <h5>{title}</h5>}
      <DroppableContainer
        id='columns'
        horizontal
        style={{
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          display: 'grid',
          gridTemplateColumns: getGridCellSize(defaultColumns)
        }}
      >
        {instance.getHeaderGroups().map(headerGroup =>
          headerGroup.headers.map((header, i) => (
            <DraggableContainer
              key={header.id}
              id={header.id}
              index={i}
              style={{ padding: 8 }}
            >
              {header.isPlaceholder ? null : header.renderHeader()}
            </DraggableContainer>
          ))
        )}
      </DroppableContainer>
      <DroppableContainer
        id={id}
        style={{
          height: 'fit-content',
          marginTop: '4px',
          padding: '4px 8px 8px 8px'
        }}
      >
        {instance.getRowModel().rows.map((row, i) => (
          <DraggableContainer
            key={row.original!.id}
            id={row.original!.id}
            index={i}
            style={{
              display: 'grid',
              gridTemplateColumns: getGridCellSize(defaultColumns),
              width: 'fit-content'
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
          </DraggableContainer>
        ))}
      </DroppableContainer>
    </div>
  );
};
