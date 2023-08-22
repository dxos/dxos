//
// Copyright 2023 DXOS.org
//

import { Cell, ColumnDef, flexRender, getCoreRowModel, Row, RowData, useReactTable } from '@tanstack/react-table';
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { mx } from '@dxos/aurora-theme';
import { stripKeys } from '@dxos/util';

export type GridColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<TData, TValue>;

// TODO(burdon): Size property.
// TODO(burdon): Style builder.
// TODO(burdon): Key equivalence (test for equals?)
// TODO(burdon): Editable.
// TODO(burdon): Sort/filter.
// TODO(burdon): Scroll to selection; sticky bottom.
// TODO(burdon): Drag-and-drop.
// TODO(burdon): No header.
// TODO(burdon): Virtual (e.g., log panel).
// TODO(burdon): Resize.

/**
 * Simplified ColumnDef definition.
 * https://tanstack.com/table/v8/docs/guide/column-defs
 */
// TODO(burdon): Consider alternative to use ColumnDef directly with helpers.
export type GridColumn<TData extends RowData, TValue = any> = {
  id: string;
  key?: boolean; // TODO(burdon): May not be unique key (see LoggingPanel).
  hidden?: boolean; // TODO(burdon): Check rt.
  accessor?: string | ((params: TData) => any);
  width?: number; // TODO(burdon): size, maxSize property.
  header?: {
    label?: string; // TODO(burdon): Convert to render function | string.
    render?: (params: { column: GridColumn<TData>; data: TData[] }) => ReactNode;
    className?: string;
  };
  cell?: {
    render?: (params: { column: GridColumn<TData>; data: TData[]; row: TData; value: TValue }) => ReactNode;
    className?: CellValueOrFunction<TData, any, string>;
  };
  footer?: {
    render?: (params: { column: GridColumn<TData>; data: TData[] }) => ReactNode;
  };
};

export type GridColumnConstructor<TData extends RowData, TValue> = (...props: any[]) => GridColumn<TData, TValue>;

const mapColumns = <TData extends RowData>(columns: GridColumn<TData>[], data: TData[]): ColumnDef<TData>[] =>
  columns.map((column) => {
    const { id, accessor, header, cell, footer } = column;
    return stripKeys({
      id,
      accessorKey: typeof accessor === 'string' ? accessor : id,
      accessorFn: typeof accessor === 'function' ? accessor : undefined,
      header: header?.render ? () => header.render!({ column, data }) : header?.label,
      cell: cell?.render
        ? ({ row, cell: cellValue }) => cell.render!({ column, data, row: row.original, value: cellValue.getValue() })
        : undefined,
      footer: footer?.render ? () => footer.render!({ column, data }) : undefined,
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
  onSelectedChange?: (selection: TKey | TKey[] | undefined, rows: TData | TData[] | undefined) => void;
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
  columnDefs?: GridColumnDef<TData>[];
  columns?: GridColumn<TData>[];
  data?: TData[];
  slots?: GridSlots;
  header?: boolean;
  footer?: boolean;
  pinToBottom?: boolean;
} & GridSelection<TData>;

/**
 * Simple table.
 */
export const Grid = <TData extends RowData>({
  columnDefs,
  columns = [],
  data = [],
  slots,
  selection = 'single', // TODO(burdon): No select by default.
  selected,
  onSelect,
  onSelectedChange,
  header: showHeader = true,
  footer: showFooter = false,
  pinToBottom,
}: GridProps<TData>) => {
  const keyColumn = columns.find((column) => column.key);
  // invariant(keyColumn?.key, 'Missing key column.');
  // TODO(burdon): Depends on object equality.
  const getRow = (id: any) => table.getRowModel().rows.find((row) => row.getValue(keyColumn!.id) === id);
  const getRowId = (row: Row<TData>) => row.getValue(keyColumn!.id);

  const [focus, setFocus] = useState<any>();
  const [selectionSet, setSelectionSet] = useState(new Set<any>());
  useEffect(() => {
    setSelectionSet(new Set<string>(Array.isArray(selected) ? selected : selected ? [selected] : []));
  }, [selection, selected]);

  const handleSelect = (id: any) => {
    if (onSelect) {
      // Controlled.
      const row = getRow(id);
      onSelect?.(id, row!.original!);
    } else {
      // Uncontrolled.
      setSelectionSet((selectionSet) => {
        updateSelection(selectionSet, id, selection);
        if (onSelectedChange) {
          if (selection === 'single' || selection === 'single-toggle') {
            const id = selectionSet.size === 0 ? undefined : selectionSet.values().next().value;
            onSelectedChange(id, id ? getRow(id)!.original! : undefined);
          } else {
            const ids = Array.from(selectionSet);
            onSelectedChange(
              ids,
              ids.map((id) => getRow(id)!.original!),
            );
          }
        }

        return new Set(selectionSet);
      });
    }
  };

  const getColumn = (id: string) => columns.find((column) => column.id === id)!;
  const getColumnStyle = (id: string) => {
    const column = getColumn(id);
    // TODO(burdon): Clash with react-table width (size) management?
    return column.width ? { width: column.width } : {};
  };

  const tableColumns = useMemo(() => mapColumns(columns, data), [columns, data]);
  const table = useReactTable({
    data,
    columns: columnDefs ?? tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Pin scrollbar to bottom.
  // TODO(burdon): Causes scrollbar to be constantly visible.
  //  https://css-tricks.com/books/greatest-css-tricks/pin-scrolling-to-bottom
  const containerRef = useRef<HTMLDivElement | null>(null);
  {
    const [stickyScrolling, setStickyScrolling] = useState(true);
    useEffect(() => {
      const container = containerRef.current;
      if (!pinToBottom || !container) {
        return;
      }

      const handler = () => {
        const bottom = container.scrollHeight - container.scrollTop - container.clientHeight === 0;
        setStickyScrolling(bottom);
      };

      container.addEventListener('scroll', handler);
      return () => container.removeEventListener('scroll', handler);
    }, []);

    useEffect(() => {
      if (!pinToBottom || !containerRef.current || !stickyScrolling) {
        return;
      }

      containerRef.current?.scroll({ top: containerRef.current.scrollHeight });
    }, [data]);
  }

  // TODO(burdon): Use radix ScrollArea.
  // https://www.radix-ui.com/primitives/docs/components/scroll-area
  return (
    <div ref={containerRef} className={mx('grow overflow-auto', slots?.root?.className)}>
      <table className='table-fixed w-full'>
        {/* TODO(burdon): Must have header group for widths. */}
        <thead className={mx(showHeader ? ['sticky top-0 z-10', slots?.header?.className] : 'collapse')}>
          {table.getHeaderGroups().map((headerGroup) => {
            // Need additional column if all columns have fixed width.
            const flex = columns?.map((column) => column.width).filter(Boolean).length === columns?.length;

            return (
              <tr key={headerGroup.id}>
                <th style={{ width: slots?.margin?.style?.width }} />
                {headerGroup.headers
                  // .filter((header) => !getColumn(header.id).hidden)
                  .map((header) => {
                    return (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={mx(slots?.cell?.className /*, getColumn(header.id).header?.className */)}
                      >
                        {!showHeader || header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  })}
                {flex && <th />}
                <th style={{ width: slots?.margin?.style?.width }} />
              </tr>
            );
          })}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            // const id = getRowId(row);
            return (
              <tr
                key={row.id}
                // onClick={() => handleSelect?.(id)}
                role='button'
                className={mx(
                  'group',
                  slots?.row?.className,
                  // selectionSet.has(id) && slots?.selected?.className,
                  // focus === id && slots?.focus?.className,
                )}
              >
                <td>
                  {/* Dummy button for focus. */}
                  <button
                    style={{ width: 1 }}
                    className='focus:outline-none'
                    // onFocus={() => setFocus(id)}
                    onBlur={() => setFocus(undefined)}
                  />
                </td>
                {row
                  .getVisibleCells()
                  // .filter((cell) => !getColumn(cell.column.id).hidden)
                  .map((cell) => {
                    return (
                      <td
                        key={cell.id}
                        className={mx(
                          'truncate',
                          // getCellValue<TData, any, string>(cell, getColumn(cell.column.id).cell?.className),
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
        {showFooter && (
          <tfoot className={mx('sticky bottom-0 z-10', slots?.footer?.className)}>
            {table.getFooterGroups().map((footerGroup) => (
              <tr key={footerGroup.id}>
                <th />
                {footerGroup.headers
                  // .filter((footer) => !getColumn(footer.id).hidden)
                  .map((footer) => {
                    return (
                      <th key={footer.id} className={mx(slots?.footer?.className)}>
                        {footer.isPlaceholder ? null : flexRender(footer.column.columnDef.footer, footer.getContext())}
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
