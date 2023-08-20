//
// Copyright 2023 DXOS.org
//

import { Cell, ColumnDef, flexRender, getCoreRowModel, Row, RowData, useReactTable } from '@tanstack/react-table';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';

import { mx } from '@dxos/aurora-theme';
import { invariant } from '@dxos/invariant';
import { stripKeys } from '@dxos/util';

type CellParams<TData extends RowData, TValue = any> = { row: TData; value: TValue };

/**
 * Simplified ColumnDef definition.
 * https://tanstack.com/table/v8/docs/guide/column-defs
 */
// TODO(burdon): Consider alternative to use ColumnDef directly with helpers.
export type GridColumn<TData extends RowData, TValue = any> = {
  id: string;
  key?: boolean; // TODO(burdon): May not be unique key (see LoggingPanel).
  accessor?: string | ((params: TData) => any);
  width?: number;
  header?: {
    label?: string;
    className?: string;
  };
  cell?: {
    render?: (params: CellParams<TData, TValue>) => ReactNode;
    className?: CellValueOrFunction<TData, any, string>;
  };
  footer?: {
    render?: ({ data }: { data: TData[] }) => ReactNode;
  };
};

export type GridColumnConstructor<TData extends RowData, TValue> = (...props: any[]) => GridColumn<TData, TValue>;

const mapColumns = <TData extends RowData>(columns: GridColumn<TData>[], data: TData[]): ColumnDef<TData>[] =>
  columns.map(({ id, accessor, header, cell, footer }) => {
    return stripKeys({
      id,
      accessorKey: typeof accessor === 'string' ? accessor : id,
      accessorFn: typeof accessor === 'function' ? accessor : undefined,
      header: header?.label,
      cell: cell?.render
        ? ({ row, cell: cellValue }) => cell.render!({ row: row.original, value: cellValue.getValue() })
        : undefined,
      footer: footer?.render ? () => footer.render!({ data }) : undefined,
    } satisfies ColumnDef<TData>);
  });

type ValueFunctionParams<TData, TValue> = { data: TData; value: TValue };
type CellValueOrFunction<TData, TValue, TResult> = TResult | ((params: ValueFunctionParams<TData, TValue>) => TResult);

const getCellValue = <TData, TValue, TResult>(
  cell: Cell<TData, TValue>,
  value: CellValueOrFunction<TData, TValue, TResult> | undefined,
) => {
  if (typeof value === 'function') {
    const fn = value as (cell: ValueFunctionParams<TData, TValue>) => TValue;
    return fn({
      data: cell.getContext().row.original,
      value: cell.getValue(),
    });
  }

  return value;
};

// TODO(burdon): Remove nested classNames? Add to theme?
export type GridSlots = {
  root?: {
    className?: string | string[];
  };
  header?: {
    className?: string | string[];
  };
  footer?: {
    className?: string | string[];
  };
  row?: {
    className?: string | string[];
  };
  cell?: {
    className?: string | string[];
  };
  focus?: {
    className?: string | string[];
  };
  selected?: {
    className?: string | string[];
  };
  margin?: {
    style?: {
      width?: number;
    };
  };
};

// TODO(burdon): Return object (not key).
type GridSelection<TData extends RowData, TKey = any> = {
  selection?: 'single' | 'single-toggle' | 'multiple' | 'multiple-toggle';
  selected?: string | string[];
  onSelect?: (id: TKey, row: TData) => void; // Controlled.
  onSelectedChange?: (selection: TKey | TKey[] | undefined) => void;
};

/**
 * Update the selection based on the mode.
 */
export const updateSelection = (selected: Set<string>, id: string, selection: GridSelection<any>['selection']) => {
  switch (selection) {
    case 'single': {
      selected.clear();
      selected.add(id);
      break;
    }
    case 'single-toggle': {
      if (selected.has(id)) {
        selected.delete(id);
      } else {
        selected.clear();
        selected.add(id);
      }
      break;
    }
    case 'multiple': {
      selected.add(id);
      break;
    }
    case 'multiple-toggle': {
      if (selected.has(id)) {
        selected.delete(id);
      } else {
        selected.add(id);
      }
      break;
    }
  }

  return selection;
};

export type GridProps<TData extends RowData> = {
  columns?: GridColumn<TData>[];
  data?: TData[];
  slots?: GridSlots;
  header?: boolean;
  footer?: boolean;
} & GridSelection<TData>;

export const Grid = <TData extends RowData>({
  columns = [],
  data = [],
  slots,
  selection = 'single',
  selected,
  onSelect,
  onSelectedChange,
  header = true,
  footer = false,
}: GridProps<TData>) => {
  const keyColumn = columns.find((column) => column.key);
  invariant(keyColumn?.key, 'Missing key column.');
  const getRowId = (row: Row<TData>) => {
    return row.getValue(keyColumn!.id);
  };

  const [focus, setFocus] = useState<any>();
  const [selectionSet, setSelectionSet] = useState(new Set<any>());
  useEffect(() => {
    setSelectionSet(new Set<string>(Array.isArray(selected) ? selected : selected ? [selected] : []));
  }, [selection, selected]);

  const handleSelect = (id: any) => {
    if (onSelect) {
      // Controlled.
      // TODO(burdon): Relies on object equality.
      const row = table.getRowModel().rows.find((row) => row.getValue(keyColumn!.id) === id);
      onSelect?.(id, row!.original!);
    } else {
      // Uncontrolled.
      setSelectionSet((selectionSet) => {
        updateSelection(selectionSet, id, selection);
        if (onSelectedChange) {
          if (selection === 'single' || selection === 'single-toggle') {
            onSelectedChange(selectionSet.size === 0 ? undefined : selectionSet.values().next().value);
          } else {
            onSelectedChange(Array.from(selectionSet));
          }
        }

        return new Set(selectionSet);
      });
    }
  };

  const getColumn = (id: string) => columns.find((column) => column.id === id)!;
  const getColumnStyle = (id: string) => {
    const column = getColumn(id);
    // TODO(burdon): Clash with react-table width management?
    return column.width ? { width: column.width } : {};
  };

  const tableColumns = useMemo(() => mapColumns(columns, data), [columns]);
  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // TODO(burdon): Use radix ScrollArea.
  // https://www.radix-ui.com/primitives/docs/components/scroll-area
  return (
    <div className={mx('grow overflow-auto', slots?.root?.className)}>
      <table className='table-fixed w-full'>
        {/* TODO(burdon): Must have header group for widths. */}
        {header && (
          <thead className={mx('sticky top-0 z-10', slots?.header?.className)}>
            {table.getHeaderGroups().map((headerGroup) => {
              // Need additional column if all columns have fixed width.
              const flex = columns?.map((column) => column.width).filter(Boolean).length === columns?.length;

              return (
                <tr key={headerGroup.id}>
                  <th style={{ width: slots?.margin?.style?.width }} />
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
                  {flex && <th />}
                  <th style={{ width: slots?.margin?.style?.width }} />
                </tr>
              );
            })}
          </thead>
        )}
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const id = getRowId(row);
            return (
              <tr
                key={row.id}
                onClick={() => handleSelect?.(id)}
                role='button'
                className={mx(
                  'group',
                  slots?.row?.className,
                  selectionSet.has(id) && slots?.selected?.className,
                  focus === id && slots?.focus?.className,
                )}
              >
                <td>
                  {/* Dummy button for focus. */}
                  <button
                    style={{ width: 1 }}
                    className='focus:outline-none'
                    onFocus={() => setFocus(id)}
                    onBlur={() => setFocus(undefined)}
                  />
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
        {footer && (
          <tfoot className={mx('sticky bottom-0 z-10', slots?.footer?.className)}>
            {table.getFooterGroups().map((footerGroup) => (
              <tr key={footerGroup.id}>
                <th />
                {footerGroup.headers.map((header) => {
                  return (
                    <th key={header.id} className={mx(slots?.footer?.className)}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.footer, header.getContext())}
                    </th>
                  );
                })}
                <th />
              </tr>
            ))}
          </tfoot>
        )}
      </table>
    </div>
  );
};
