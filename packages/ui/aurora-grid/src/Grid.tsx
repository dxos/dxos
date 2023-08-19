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
import React, { FC, PropsWithChildren, useMemo, createContext } from 'react';

import { chromeSurface, mx } from '@dxos/aurora-theme';

type GridContextType<TData> = {
  columns: ColumnDef<TData>[];
};

const GridContext = createContext<GridContextType<any> | undefined>(undefined);

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

// TODO(burdon): Remove.
export type GridSlots = {
  root?: {
    className?: string;
  };
  header?: {
    className?: string;
  };
  footer?: {
    className?: string;
  };
  row?: {
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
type GridSelection = {
  selected: string | string[];
  multiSelect?: boolean;
  onSelected?: (selection: string | string[]) => void;
};

export type GridProps<TData extends RowData> = PropsWithChildren & {
  id: ((data: TData) => string) | string;
  columns: GridColumn<TData>[];
  data?: TData[];
  slots?: GridSlots;
  Footer?: FC<{ data: TData[]; selected: string[] }>;
} & GridSelection;

export const Grid = <TData extends RowData>({
  children,
  id,
  columns,
  data = [],
  slots,
  selected,
  multiSelect,
  onSelected,
  Footer,
}: GridProps<TData>) => {
  const getId = typeof id === 'function' ? id : (data: TData) => (data as any)[id];
  const getColumn = (id: string) => columns.find((column) => column.key === id)!;
  const getColumnStyle = (id: string) => {
    const column = getColumn(id);
    return column.width ? { width: column.width } : {};
  };

  const tableColumns = useMemo<ColumnDef<TData>[]>(
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
  const _selected = new Set(selected);
  const handleSelect = onSelected
    ? (data: TData) => {
        const id = getId(data);
        if (_selected.has(id)) {
          _selected.delete(id);
        } else {
          if (!multiSelect) {
            _selected.clear();
          }
          _selected.add(id);
        }

        onSelected?.(Array.from(_selected.values()));
      }
    : undefined;

  return (
    <div className={mx('flex grow overflow-auto', chromeSurface, slots?.root?.className)}>
      <GridContext.Provider value={{ columns: tableColumns }}>
        <table className='table-fixed w-full'>
          <thead className={mx('sticky top-0 z-10', chromeSurface, slots?.header?.className)}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {/* TODO(burdon): Left-margin. */}
                <th style={{ width: 16 }} />
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      style={getColumnStyle(header.id)}
                      className={mx(slots?.cell?.className, getColumn(header.id).header?.className)}
                    >
                      z{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
                {/* TODO(burdon): Right-margin. */}
                <th style={{ width: 16 }} />
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const id = getId(row.original);
              return (
                <tr
                  key={row.id}
                  onClick={() => handleSelect?.(row.original)}
                  className={mx(
                    slots?.row?.className,
                    onSelected && 'cursor-pointer',
                    _selected.has(id) && slots?.selected?.className,
                  )}
                >
                  <td />
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
                  <td />
                </tr>
              );
            })}
          </tbody>
          <tfoot className={mx('sticky bottom-0 z-10', chromeSurface, slots?.footer?.className)}>
            <th />
            <th>
              <td colSpan={columns.length}>{children}</td>
            </th>
            <th />
          </tfoot>
        </table>
      </GridContext.Provider>
    </div>
  );
};
