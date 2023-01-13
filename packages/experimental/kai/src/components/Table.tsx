//
// Copyright 2023 DXOS.org
//

import React, { FC, useMemo } from 'react';
import { Column, useFlexLayout, useResizeColumns, useTable } from 'react-table';

import { EchoObject } from '@dxos/echo-schema';

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

/**
 * Virtual table.
 * https://react-table-v7.tanstack.com/docs/overview
 */
export const Table: FC<{ columns: Column<EchoObject>[]; data: EchoObject[] }> = ({ columns, data }) => {
  const defaultColumn = useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 30, // minWidth is only used as a limit for resizing
      width: 150, // width is used for both the flex-basis and flex-grow
      maxWidth: 200 // maxWidth is only used as a limit for resizing
    }),
    []
  );

  const { getTableProps, headerGroups, prepareRow, rows } = useTable<EchoObject>(
    { columns, data, defaultColumn },
    useResizeColumns,
    useFlexLayout
  );

  return (
    // TODO(burdon): Remove table class to force scrolling.
    <div {...getTableProps()} className='__table flex flex-col flex-1'>
      {/* Header */}
      <div>
        {headerGroups.map((headerGroup) => (
          // eslint-disable-next-line react/jsx-key
          <div
            {...headerGroup.getHeaderGroupProps({
              // style: { paddingRight: '15px' },
            })}
            className='tr bg-gray-200'
          >
            {/* TODO(burdon): see UseResizeColumnsColumnProps */}
            {headerGroup.headers.map((column: any) => (
              // eslint-disable-next-line react/jsx-key
              <div {...column.getHeaderProps(headerProps)} className='th pl-2 pr-2'>
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
      <div className='tbody overflow-y-scroll'>
        <div>
          {rows.map((row, i) => {
            prepareRow(row);
            return (
              // eslint-disable-next-line react/jsx-key
              <div {...row.getRowProps()} className='tr'>
                {row.cells.map((cell) => {
                  return (
                    // eslint-disable-next-line react/jsx-key
                    <div {...cell.getCellProps(cellProps)} className='td pl-2 pr-2 overflow-hidden text-ellipsis'>
                      {cell.render('Cell')}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
