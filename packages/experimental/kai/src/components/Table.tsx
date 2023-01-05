//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useFlexLayout, useResizeColumns, useTable } from 'react-table';

import { EchoObject } from '@dxos/echo-schema';

// https://react-table-v7.tanstack.com/docs/overview
// https://github.com/TanStack/table/blob/v7/examples/full-width-resizable-table/src/App.js

// TODO(burdon): Adapter for Project type.
// TODO(burdon): Object to represent properties (e.g., width, bindings) for table.

const getStyles = (props: any, align = 'left') => [
  props,
  {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: align === 'right' ? 'flex-end' : 'flex-start'
    }
  }
];

const headerProps = (props: any, { column }: { column: any }) => getStyles(props, column.align);

const cellProps = (props: any, { cell }: { cell: any }) => getStyles(props, cell.column.align);

export const Table = () => {
  const { getTableProps, headerGroups, prepareRow, rows } = useTable<EchoObject>(
    {
      columns: [],
      data: []
    },
    useResizeColumns,
    useFlexLayout
  );

  return (
    <div {...getTableProps()} className='table'>
      {/* Header */}
      <div>
        {headerGroups.map((headerGroup) => (
          // eslint-disable-next-line react/jsx-key
          <div
            {...headerGroup.getHeaderGroupProps({
              // style: { paddingRight: '15px' },
            })}
            className='tr'
          >
            {/* TODO(burdon): see UseResizeColumnsColumnProps */}
            {headerGroup.headers.map((column: any) => (
              // eslint-disable-next-line react/jsx-key
              <div {...column.getHeaderProps(headerProps)} className='th'>
                {column.render('Header')}

                {/* Use column.getResizerProps to hook up the events correctly. */}
                {column.canResize && (
                  <div {...column.getResizerProps()} className={`resizer ${column.isResizing ? 'isResizing' : ''}`} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className='tbody'>
        {rows.map((row, i) => {
          prepareRow(row);
          return (
            // eslint-disable-next-line react/jsx-key
            <div {...row.getRowProps()} className='tr'>
              {row.cells.map((cell) => {
                return (
                  // eslint-disable-next-line react/jsx-key
                  <div {...cell.getCellProps(cellProps)} className='td'>
                    {cell.render('Cell')}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
