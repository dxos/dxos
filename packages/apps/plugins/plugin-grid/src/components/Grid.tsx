//
// Copyright 2023 DXOS.org
//

import {
  Cell,
  CellContext,
  ColumnDef,
  ColumnDefTemplate,
  flexRender,
  getCoreRowModel,
  RowData,
  useReactTable,
} from '@tanstack/react-table';
import React, { useMemo } from 'react';

import { chromeSurface, mx } from '@dxos/aurora-theme';

type ValueFunctionParams<TData, TValue> = { data: TData; value: TValue };
type CellValueOrFunction<TData, TValue, TResult> = TResult | ((params: ValueFunctionParams<TData, TValue>) => TResult);

const getCellValue = <TData, TValue, TResult>(
  cell: Cell<TData, TValue>,
  value: CellValueOrFunction<TData, TValue, TResult> | undefined,
) => {
  if (typeof value === 'function') {
    const f = value as (cell: ValueFunctionParams<TData, TValue>) => TValue;
    return f({
      data: cell.getContext().row.original,
      value: cell.getValue(),
    });
  }

  return value;
};

// https://tanstack.com/table/v8/docs/guide/column-defs
export type GridColumn<TData extends RowData> = /* Pick<ColumnDef<T>, 'cell'> & */ {
  key: string;
  width?: number;
  getValue?: (params: TData) => any;
  header?: {
    className?: string;
  };
  cell?: {
    className?: CellValueOrFunction<TData, any, string>;
    render?: ColumnDefTemplate<CellContext<TData, any>>;
  };
};

export type GridSlots = {
  header?: {
    className?: string;
  };
  cell?: {
    className?: string;
  };
};

export type GridProps<TData extends RowData> = {
  columns: GridColumn<TData>[];
  data?: TData[];
  slots?: GridSlots;
};

export const Grid = <TData extends RowData>({ columns, data = [], slots }: GridProps<TData>) => {
  const tableColumns = useMemo(
    () =>
      columns.map(({ key, getValue, cell }) => {
        const column: ColumnDef<TData> = {
          id: key,
          accessorFn: (data: TData) => (getValue ? getValue(data) : (data as any)[key]),
        };
        if (cell?.render) {
          column.cell = cell.render;
        }
        return column;
      }),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const getColumn = (id: string) => columns.find((column) => column.key === id)!;
  const getColumnStyle = (id: string) => {
    const column = getColumn(id);
    return column.width ? { width: column.width } : {};
  };

  // TODO(burdon): Custom Cell renderer.
  // TODO(burdon): Aurora styles?
  // TODO(burdon): Optionally scroll horizontally.
  // TODO(burdon): Editable.
  // TODO(burdon): Create simple specialized table for devtools (auto detect keys, links, etc.)

  return (
    <div className='flex grow overflow-auto px-4'>
      <table className='table-fixed w-full'>
        <thead className={mx('sticky top-0 z-10', chromeSurface, slots?.header?.className)}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <th
                    key={header.id}
                    style={getColumnStyle(header.id)}
                    className={mx(slots?.cell?.className, getColumn(header.id).header?.className)}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => {
                return (
                  <td
                    key={cell.id}
                    className={mx(
                      'truncate',
                      getCellValue<TData, any, string>(cell, getColumn(cell.column.id).cell?.className),
                      slots?.cell?.className,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
