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
  selected?: {
    className?: string;
  };
};

// TODO(burdon): Should this be a separate model or just & to properties?
export type GridSelectionModel<TKey> = {
  selected: TKey[];
  multiSelect?: boolean;
  onSelected?: (selection: TKey[]) => void;
};

export type GridProps<TData extends RowData, TKey> = {
  id: ((data: TData) => TKey) | string;
  columns: GridColumn<TData>[];
  data?: TData[];
  selectionModel?: GridSelectionModel<TKey>;
  slots?: GridSlots;
};

export const Grid = <TData extends RowData, TKey>({
  id,
  columns,
  data = [],
  slots,
  selectionModel,
}: GridProps<TData, TKey>) => {
  const getId = typeof id === 'function' ? id : (data: TData) => (data as any)[id];
  const getColumn = (id: string) => columns.find((column) => column.key === id)!;
  const getColumnStyle = (id: string) => {
    const column = getColumn(id);
    return column.width ? { width: column.width } : {};
  };

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

  // TODO(burdon): Key cursor up/down.
  const selected = new Set(selectionModel?.selected);
  const handleSelect = (data: TData) => {
    if (selectionModel) {
      const id = getId(data);
      if (selected.has(id)) {
        selected.delete(id);
      } else {
        if (!selectionModel.multiSelect) {
          selected.clear();
        }
        selected.add(id);
      }

      selectionModel.onSelected?.(Array.from(selected.values()));
    }
  };

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
          {table.getRowModel().rows.map((row) => {
            const id = getId(row.original);
            return (
              <tr
                key={row.id}
                onClick={() => handleSelect(row.original)}
                className={mx(selectionModel && 'cursor-pointer', selected.has(id) && slots?.selected?.className)}
              >
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
