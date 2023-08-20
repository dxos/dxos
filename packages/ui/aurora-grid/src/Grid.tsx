//
// Copyright 2023 DXOS.org
//

import { Cell, ColumnDef, flexRender, getCoreRowModel, RowData, useReactTable } from '@tanstack/react-table';
import React, { ReactNode, useMemo, useState } from 'react';

import { chromeSurface, mx } from '@dxos/aurora-theme';
import { stripKeys } from '@dxos/util';

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

// TODO(burdon): Why wrap this rather than providing helpers?
// https://tanstack.com/table/v8/docs/guide/column-defs
export type GridColumn<TData extends RowData, TValue = any> = {
  key: string;
  value?: (params: TData) => any;
  width?: number;
  header?: {
    label?: string;
    className?: string;
  };
  cell?: {
    render?: ({ row, value }: { row: TData; value: TValue }) => ReactNode;
    className?: CellValueOrFunction<TData, any, string>;
  };
  footer?: {
    render?: ({ data }: { data: TData[] }) => ReactNode;
  };
};

export type GridColumnConstructor<TData extends RowData, TValue> = (...props: any[]) => GridColumn<TData, TValue>;

// TODO(burdon): Remove nested classNames? Add to theme?
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
  focus?: {
    className?: string;
  };
  selected?: {
    className?: string;
  };
};

type GridSelection = {
  selected?: string | string[];
  multiSelect?: boolean;
  onSelected?: (selection: string | string[] | undefined) => void;
};

export type GridProps<TData extends RowData> = {
  id: ((data: TData) => string) | string;
  columns: GridColumn<TData>[];
  data?: TData[];
  slots?: GridSlots;
} & GridSelection;

export const Grid = <TData extends RowData>({
  id,
  columns,
  data = [],
  slots,
  selected,
  multiSelect,
  onSelected,
}: GridProps<TData>) => {
  const [focus, setFocus] = useState<string>();

  const getId = typeof id === 'function' ? id : (data: TData) => (data as any)[id];
  const getColumn = (id: string) => columns.find((column) => column.key === id)!;
  const getColumnStyle = (id: string) => {
    const column = getColumn(id);
    return column.width ? { width: column.width } : {};
  };

  const tableColumns = useMemo<ColumnDef<TData>[]>(
    () =>
      columns.map(({ key, value, header, cell, footer }) => {
        return stripKeys({
          id: key,
          accessorFn: (data: TData) => (value ? value(data) : (data as any)[key]),
          header: header?.label,
          cell: cell?.render
            ? ({ row, cell: cellValue }) => cell.render!({ row: row.original, value: cellValue.getValue() })
            : undefined,
          footer: footer?.render ? () => footer.render!({ data }) : undefined,
        } satisfies ColumnDef<TData>);
      }),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedSet = new Set<string>(Array.isArray(selected) ? selected : selected ? [selected] : []);
  const handleSelect = onSelected
    ? (id: string) => {
        if (selectedSet.has(id)) {
          selectedSet.delete(id);
        } else {
          if (!multiSelect) {
            selectedSet.clear();
          }
          selectedSet.add(id);
        }

        if (multiSelect) {
          onSelected(Array.from(selectedSet.values()));
        } else {
          onSelected(selectedSet.values().next().value);
        }
      }
    : undefined;

  return (
    <div className={mx('__flex grow overflow-auto', chromeSurface, slots?.root?.className)}>
      <table className='table-fixed w-full'>
        <thead className={mx('sticky top-0 z-10', chromeSurface, slots?.header?.className)}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              <th style={{ width: 16 }} />
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
                onClick={() => handleSelect?.(id)}
                role='button'
                className={mx(
                  'group',
                  onSelected && 'cursor-pointer',
                  slots?.row?.className,
                  selectedSet.has(id) && slots?.selected?.className,
                  focus === id && slots?.focus?.className,
                )}
              >
                <td>
                  <button
                    style={{ width: 1 }}
                    className='focus:outline-none'
                    onFocus={() => setFocus(id)}
                    onBlur={() => setFocus(undefined)}
                  >
                    &nbsp;
                  </button>
                </td>
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
          {table.getFooterGroups().map((footerGroup) => (
            <tr key={footerGroup.id}>
              <th style={{ width: 16 }} />
              {footerGroup.headers.map((header) => {
                return (
                  <th key={header.id} className={mx(slots?.footer?.className)}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.footer, header.getContext())}
                  </th>
                );
              })}
              <th style={{ width: 16 }} />
            </tr>
          ))}
        </tfoot>
      </table>
    </div>
  );
};
