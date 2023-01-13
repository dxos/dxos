//
// Copyright 2022 DXOS.org
//

import { horizontalListSortingStrategy, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ColumnOrderState, createTable, getCoreRowModel, useTableInstance } from '@tanstack/react-table';
import React, { useEffect, useState } from 'react';

import { DraggableContainer } from '../DraggableContainer';
import { DroppableContainer } from '../DroppableContainer';
import { Row } from './Row';

type RowProps = {
  id: string;
};

const table = createTable().setRowType<RowProps>();

const getColumns = (cols: any[]) =>
  cols.map((col) =>
    table.createDataColumn(col.accessor, {
      header: () => <span>{col.title}</span>,
      cell: (info: any) => info.getValue()
    })
  );

const DEFAULT_COLUMN_WIDTH = '300px';
const getGridCellSize = (columns: any[]) => columns.map((column) => column.width ?? DEFAULT_COLUMN_WIDTH).join(' ');

export interface DroppableTableProps {
  id: string;
  rows: any[];
  columns: any[];
  columnOrder?: string[];
  title?: string;
}

export const DroppableTable = ({
  id,
  rows: data,
  columns: defaultColumns,
  columnOrder: order,
  title
}: DroppableTableProps) => {
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
    if (order) {
      instance.setColumnOrder(order);
    }
  }, [order]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'scroll'
      }}
    >
      {title && <h5>{title}</h5>}
      <DroppableContainer
        id='columns'
        style={{
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          display: 'grid',
          gridTemplateColumns: getGridCellSize(defaultColumns),
          width: 'fit-content'
        }}
      >
        <SortableContext id={`columns-${id}`} items={columnOrder} strategy={horizontalListSortingStrategy}>
          {instance.getHeaderGroups().map((headerGroup) =>
            headerGroup.headers.map((header) => (
              <DraggableContainer key={header.id} id={header.id} style={{ padding: 8 }}>
                {header.isPlaceholder ? null : header.renderHeader()}
              </DraggableContainer>
            ))
          )}
        </SortableContext>
      </DroppableContainer>
      <DroppableContainer
        id={id}
        style={{
          height: '100%',
          marginTop: '4px',
          padding: '4px 8px 8px 8px',
          borderRadius: '5px',
          border: '1px solid white'
        }}
      >
        <SortableContext
          id={id}
          items={instance.getRowModel().rows.map((row) => row.original!.id)}
          strategy={verticalListSortingStrategy}
        >
          {instance.getRowModel().rows.map((row) => (
            <DraggableContainer
              key={row.original!.id}
              id={row.original!.id}
              style={{ width: 'fit-content' }}
              placeholderStyles={{ opacity: 0.5 }}
            >
              <Row
                row={row}
                style={{
                  display: 'grid',
                  gridTemplateColumns: getGridCellSize(defaultColumns)
                }}
              />
            </DraggableContainer>
          ))}
        </SortableContext>
      </DroppableContainer>
    </div>
  );
};
