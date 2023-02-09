//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';
import { Column, useFlexLayout, useResizeColumns, useTable } from 'react-table';

import { mx } from '@dxos/react-components';

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

export type TableClasses = {
  root?: string;
  header?: string;
  row?: string;
  selected?: string;
};

// TODO(burdon): Theme.
export const defaultTableClasses: TableClasses = {
  header: 'text-sm',
  row: 'hover:bg-gray-200',
  selected: 'bg-slate-300'
};

export type TableProps<T extends {}> = {
  classes?: TableClasses;
  columns: Column<T>[];
  data?: T[];
  selected?: T;
  onSelect?: (item: T) => void;
};

/**
 * Virtual table.
 * https://react-table-v7.tanstack.com/docs/overview
 */
// TODO(burdon): Checkbox in left gutter.
export const Table = <T extends {}>({
  columns,
  data = [],
  classes = defaultTableClasses,
  onSelect,
  selected
}: TableProps<T>) => {
  const defaultColumn = useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 30, // minWidth is only used as a limit for resizing
      width: 240, // width is used for both the flex-basis and flex-grow
      maxWidth: 240 // maxWidth is only used as a limit for resizing
    }),
    []
  );

  const { getTableProps, headerGroups, prepareRow, rows } = useTable<T>(
    { columns, data, defaultColumn },
    useResizeColumns,
    useFlexLayout
  );

  return (
    // TODO(burdon): Remove table class to force scrolling.
    <div className={mx('flex flex-1 flex-col overflow-x-auto', classes?.root)}>
      <div className='table' {...getTableProps()}>
        {/* Header */}
        <div className='thead sticky top-0'>
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
                <div {...column.getHeaderProps(headerProps)} className={mx('th px-4 py-2', classes?.header)}>
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
        <div className='tbody overflow-y-auto'>
          {rows.map((row) => {
            prepareRow(row);

            return (
              // eslint-disable-next-line react/jsx-key
              <div
                className={mx(
                  'tr border-b border-solid border-slate-100 cursor-pointer',
                  row.original === selected && classes?.selected,
                  classes?.row
                )}
                onClick={() => onSelect?.(row.original)}
                {...row.getRowProps()}
              >
                {row.cells.map((cell) => {
                  return (
                    // eslint-disable-next-line react/jsx-key
                    <div {...cell.getCellProps(cellProps)} className='td px-4 py-2'>
                      <div className='overflow-hidden text-ellipsis whitespace-nowrap'>{cell.render('Cell')}</div>
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
