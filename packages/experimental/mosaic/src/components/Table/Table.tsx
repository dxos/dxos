//
// Copyright 2023 DXOS.org
//

import React, { type MutableRefObject, useMemo } from 'react';
import { type CellProps, type Column, useFlexLayout, useResizeColumns, useTable } from 'react-table';

import { mx } from '@dxos/aurora-theme';

// TODO(burdon): Think about re-exports.
export type TableCellProps<T extends object = {}> = CellProps<T>;
export type TableColumn<T extends object = {}> = Column<T> & { align?: 'left' | 'right' };

// https://github.com/TanStack/table/blob/v7/examples/full-width-resizable-table/src/App.js

// TODO(burdon): Adapter for Project type.
// TODO(burdon): Object to represent properties (e.g., width, bindings) for table.
// TODO(burdon): Re-export Column.

const getStyles = (props: any, justify = 'left') => [
  props,
  {
    style: {
      display: 'flex',
      justifyContent: justify === 'right' ? 'flex-end' : 'flex-start', // TODO(burdon): items-center row.
    },
  },
];

const headerProps = (props: any, { column }: { column: any }) => getStyles(props, column.align);

const cellProps = (props: any, { cell }: { cell: any }) => getStyles(props, cell.column.align);

export type TableSlots = {
  root?: { className?: string; ref?: MutableRefObject<HTMLDivElement | null> };
  header?: { className?: string; ref?: MutableRefObject<HTMLDivElement | null> };
  body?: { className?: string; ref?: MutableRefObject<HTMLDivElement | null> };
  row?: { className: string };
  cell?: { className: string };
  selected?: { className: string };
};

export type TableProps<T extends {}> = {
  columns: TableColumn<T>[];
  data?: T[];
  slots?: TableSlots;
  selected?: T;
  onSelect?: (item: T) => void;
  compact?: boolean;
};

/**
 * Virtual table.
 * https://react-table-v7.tanstack.com/docs/overview
 */
// TODO(burdon): Checkbox in left gutter.
export const Table = <T extends {}>({
  columns,
  data = [],
  slots = {},
  compact = false,
  selected,
  onSelect,
}: TableProps<T>) => {
  const defaultColumn = useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 30, // minWidth is only used as a limit for resizing
      width: 240, // width is used for both the flex-basis and flex-grow
      maxWidth: 240, // maxWidth is only used as a limit for resizing
    }),
    [],
  );

  const { getTableProps, headerGroups, prepareRow, rows } = useTable<T>(
    { columns, data, defaultColumn },
    useResizeColumns,
    useFlexLayout,
  );

  return (
    <div ref={slots.root?.ref} className={mx('flex flex-col overflow-x-auto', slots.root?.className)}>
      <div className='table' {...getTableProps()}>
        {/* Header */}
        {/* TODO(burdon): Header is transparent. */}
        <div ref={slots.header?.ref} className='thead sticky top-0'>
          {headerGroups.map((headerGroup) => (
            // eslint-disable-next-line react/jsx-key
            <div {...headerGroup.getHeaderGroupProps()} className='tr h-[2rem] border-b'>
              {/* TODO(burdon): see UseResizeColumnsColumnProps */}
              {headerGroup.headers.map((column: any) => (
                // eslint-disable-next-line react/jsx-key
                <div
                  {...column.getHeaderProps(headerProps)}
                  className={mx('th px-4 items-center', slots.header?.className)}
                >
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
        <div ref={slots.body?.ref} className={mx('tbody overflow-y-auto', slots.body?.className)}>
          {rows.map((row) => {
            prepareRow(row);

            return (
              // eslint-disable-next-line react/jsx-key
              <div
                className={mx('tr', slots.row?.className, row.original === selected && slots.selected?.className)}
                onClick={() => onSelect?.(row.original)}
                {...row.getRowProps()}
              >
                {row.cells.map((cell) => {
                  return (
                    // TODO(burdon): Factor out defaults.
                    // eslint-disable-next-line react/jsx-key
                    <div
                      {...cell.getCellProps(cellProps)}
                      className={mx('td px-4', compact ? 'py-1' : 'py-2', slots?.cell?.className)}
                    >
                      <div className='truncate'>{cell.render('Cell')}</div>
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
