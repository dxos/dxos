//
// Copyright 2023 DXOS.org
//

import {
  ColumnDef,
  Row,
  RowData,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  ColumnSizingInfoState,
} from '@tanstack/react-table';
import React, { useEffect, useRef, useState } from 'react';

import { inputSurface, mx } from '@dxos/aurora-theme';

import { defaultGridSlots, GridSlots } from './theme';

// Meta definition.
declare module '@tanstack/react-table' {
  // TODO(burdon): No direct way to access table meta so added to column meta.
  interface TableMeta<TData extends RowData> {
    keyAccessor?: KeyValue<TData>;
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    table?: TableMeta<TData>;
    expand?: boolean;
    resizable?: boolean;
    slots?: {
      header?: {
        className?: string;
      };
      footer?: {
        className?: string;
      };
      cell?: {
        className?: string;
      };
    };
  }
}

export type GridColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<TData, TValue>;

// TODO(burdon): Editable.
// TODO(burdon): Sort/filter.
// TODO(burdon): Scroll to selection; sticky bottom.
// TODO(burdon): Drag-and-drop.
// TODO(burdon): Virtual (e.g., log panel).
// TODO(burdon): Resize.

// TODO(burdon): Provide id mapper.
type GridSelection<TData extends RowData> = {
  // Controlled if undefined (by default).
  select?: 'single' | 'single-toggle' | 'multiple' | 'multiple-toggle' | undefined;
  selected?: TData[];
  onSelectedChange?: (selected: TData[] | undefined) => void;
};

/**
 * Util to update the selection based on the mode.
 */
export const updateSelection = (
  selectionState: RowSelectionState,
  id: string,
  selection: GridSelection<any>['select'],
): RowSelectionState => {
  switch (selection) {
    case 'single': {
      return {
        [id]: true,
      };
    }
    case 'single-toggle': {
      return selectionState[id]
        ? {}
        : {
            [id]: true,
          };
    }
    case 'multiple': {
      return {
        [id]: true,
        ...selectionState,
      };
    }
    case 'multiple-toggle': {
      if (selectionState[id]) {
        const newSelectionState = { ...selectionState };
        delete newSelectionState[id];
        return newSelectionState;
      } else {
        return {
          [id]: true,
          ...selectionState,
        };
      }
    }
  }

  return selectionState;
};

const defaultColumn: Partial<ColumnDef<RowData>> = {
  size: 200, // NOTE: Required in order remove default width.
};

export type KeyValue<TData extends RowData> = (row: Row<TData>) => string | number;

// TODO(burdon): Key selector.
export type GridProps<TData extends RowData> = {
  keyAccessor?: KeyValue<TData>;
  columns?: GridColumnDef<TData>[];
  columnVisibility?: VisibilityState;
  data?: TData[];
  slots?: GridSlots;
  header?: boolean;
  footer?: boolean;
  onColumnResize?: (state: Record<string, number>) => void;
  border?: boolean;
  fullWidth?: boolean;
  pinToBottom?: boolean;
  debug?: boolean;
} & GridSelection<TData>;

/**
 * Simple table.
 */
export const Grid = <TData extends RowData>({
  keyAccessor = (row) => row.id,
  columns = [],
  data = [],
  columnVisibility,
  slots = defaultGridSlots,
  select,
  selected,
  onColumnResize,
  onSelectedChange,
  header: showHeader = true,
  footer: showFooter = false,
  border: showBorder,
  fullWidth,
  pinToBottom,
  debug,
}: GridProps<TData>) => {
  const [focus, setFocus] = useState<string>();

  // Update controlled selection.
  // https://tanstack.com/table/v8/docs/api/features/row-selection
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  useEffect(() => {
    setRowSelection(
      selected?.reduce((selectionState: RowSelectionState, selected) => {
        const row = table.getRowModel().rows.find((row) => row.original === selected);
        if (row) {
          selectionState[row.id] = true;
        }
        return selectionState;
      }, {}) ?? {},
    );
  }, [select, selected]);

  // Resizing.
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>({} as ColumnSizingInfoState);
  useEffect(() => {
    if (columnSizingInfo.columnSizingStart?.length === 0) {
      onColumnResize?.(table.getState().columnSizing);
    }
  }, [columnSizingInfo]);

  // Update table model.
  // https://tanstack.com/table/v8/docs/api/core/table
  const table = useReactTable({
    data,
    columns,
    defaultColumn: defaultColumn as Partial<ColumnDef<TData>>,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      keyAccessor,
    },

    // TODO(burdon): Pagination.
    // TODO(burdon): Sorting.
    // TODO(burdon): Filtering.
    state: {
      columnVisibility,
      columnSizingInfo,
      rowSelection,
    },

    enableRowSelection: select === 'single' || select === 'single-toggle',
    enableMultiRowSelection: select === 'multiple' || select === 'multiple-toggle',
    onRowSelectionChange: (rows) => {
      setRowSelection(rows);
    },

    // TODO(burdon): Drag to re-order columns.
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    onColumnSizingInfoChange: setColumnSizingInfo,

    debugTable: debug,
  });

  // TODO(burdon): Add flex if not resizable.
  // Create additional expansion column if all columns have fixed width.
  const addFlex = false; // columns.map((column) => column.size).filter(Boolean).length === columns?.length;

  // Pin scrollbar to bottom.
  const containerRef = usePinToBottom(data, pinToBottom);

  const handleSelect = (row: Row<TData>) => {
    if (select) {
      // Uncontrolled.
      setRowSelection((selectionState: RowSelectionState) => {
        const newSelectionState = updateSelection(selectionState, row.id, select);
        if (onSelectedChange) {
          const rows: TData[] = Object.keys(newSelectionState).map((id) => table.getRowModel().rowsById[id].original);
          onSelectedChange(rows);
        }

        return newSelectionState;
      });
    } else {
      // Controlled.
      onSelectedChange?.([row.original]);
    }
  };

  const showRowNumber = debug;

  // TODO(burdon): Use radix ScrollArea.
  // https://www.radix-ui.com/primitives/docs/components/scroll-area
  return (
    <div ref={containerRef} className={mx('grow overflow-auto', inputSurface, slots?.root?.className)}>
      <table
        // Styles:
        // table-fixed: Prevents fixed sized columns from shrinking.
        className={mx(!fullWidth && 'table-fixed ', 'border-collapse', slots?.table?.className)}
        style={{
          width: fullWidth ? '100%' : table.getTotalSize(),
        }}
      >
        {/*
         * Header
         */}
        <thead className={mx(showHeader ? ['sticky top-0 z-10'] : 'collapse')}>
          {table.getHeaderGroups().map((headerGroup) => {
            return (
              // Group element to hover resize handles.
              <tr key={headerGroup.id} className='font-light group'>
                {slots?.margin && <th className={mx(slots?.margin?.className)} />}

                {/* TODO(burdon): Calc. width. */}
                {showRowNumber && (
                  <th className='text-left' style={{ width: 32 }}>
                    #
                  </th>
                )}

                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      style={{
                        // Don't set width if fullWidth and no explicit size.
                        width: fullWidth && header.column.columnDef.meta?.expand ? undefined : header.getSize(),
                      }}
                      // Relative for resize handle.
                      className={mx(
                        'relative text-left',
                        showBorder && 'border',
                        slots?.header?.className,
                        header.column.columnDef.meta?.slots?.header?.className,
                      )}
                    >
                      {!showHeader || header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}

                      {/*
                       * Resize handle.
                       * https://codesandbox.io/p/sandbox/github/tanstack/table/tree/main/examples/react/column-sizing
                       */}
                      {header.column.columnDef.meta?.resizable && (
                        <div
                          className={mx(
                            'absolute top-0 pl-1 h-full z-[10] w-[7px] -right-[5px] _bg-neutral-500',
                            'cursor-col-resize select-none touch-none opacity-20 hover:opacity-100',
                            header.column.getIsResizing() && 'hidden',
                          )}
                          style={{
                            transform: header.column.getIsResizing()
                              ? `translateX(${table.getState().columnSizingInfo.deltaOffset}px)`
                              : undefined,
                          }}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                        >
                          <div className='flex group-hover:bg-neutral-700 -ml-[2px] w-[1px] h-full' />
                        </div>
                      )}
                    </th>
                  );
                })}
                {addFlex && <th />}
                {slots?.margin && <th className={mx(slots?.margin?.className)} />}
              </tr>
            );
          })}
        </thead>

        {/*
         * Body
         */}
        <tbody>
          {table.getRowModel().rows.map((row) => {
            // TODO(burdon): ID property.
            return (
              <tr
                key={keyAccessor(row)}
                onClick={() => handleSelect(row)}
                role='button'
                className={mx(
                  'group',
                  rowSelection[row.id] && slots?.selected?.className,
                  focus === row.id && slots?.focus?.className,
                  slots?.row?.className,
                )}
              >
                {/* TODO(burdon): Dummy button for focus (don't alter geometry). */}
                {slots?.margin && (
                  <td className={mx(slots?.margin?.className)}>
                    <button
                      role='button'
                      style={{ width: 1, height: 1 }}
                      className='focus:outline-none'
                      onFocus={() => setFocus(row.id)}
                      onBlur={() => setFocus(undefined)}
                      onKeyDown={(event) => {
                        // TODO(burdon): Move focus.
                        switch (event.key) {
                          case 'ArrowUp': {
                            break;
                          }
                          case 'ArrowDown': {
                            break;
                          }
                        }
                      }}
                    />
                  </td>
                )}

                {showRowNumber && <td>{row.id}</td>}

                {row.getVisibleCells().map((cell) => {
                  // TODO(burdon): Allow class override from column.
                  return (
                    <td
                      key={cell.id}
                      className={mx(
                        showBorder && 'border',
                        slots?.cell?.className,
                        cell.column.columnDef.meta?.slots?.cell?.className,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}

                {addFlex && <td />}
                {slots?.margin && <td className={mx(slots?.margin?.className)} />}
              </tr>
            );
          })}
        </tbody>

        {/*
         * Footer
         */}
        {showFooter && (
          <tfoot className={mx('sticky bottom-0 z-10', slots?.footer?.className)}>
            {table.getFooterGroups().map((footerGroup) => (
              <tr key={footerGroup.id} className='font-thin'>
                {slots?.margin && <th className={mx(slots?.margin?.className)} />}
                {showRowNumber && <th />}

                {footerGroup.headers.map((footer) => {
                  return (
                    <th
                      key={footer.id}
                      className={mx(
                        showBorder && 'border',
                        'text-left',
                        slots?.footer?.className,
                        footer.column.columnDef.meta?.slots?.footer?.className,
                      )}
                    >
                      {footer.isPlaceholder ? null : flexRender(footer.column.columnDef.footer, footer.getContext())}
                    </th>
                  );
                })}

                {addFlex && <th />}
                {slots?.margin && <th className={mx(slots?.margin?.className)} />}
              </tr>
            ))}
          </tfoot>
        )}
      </table>

      {debug && (
        <pre className='font-mono text-xs text-neutral-500 my-4 p-2 ring'>
          <code>{JSON.stringify(table.getState(), undefined, 2)}</code>
        </pre>
      )}
    </div>
  );
};

/**
 * Glue to bottom as rows are added.
 */
// TODO(burdon): Causes scrollbar to be constantly visible.
//  https://css-tricks.com/books/greatest-css-tricks/pin-scrolling-to-bottom
const usePinToBottom = <TData extends RowData>(data: TData[], pinToBottom?: boolean) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stickyScrolling, setStickyScrolling] = useState(true);
  useEffect(() => {
    const container = containerRef.current;
    if (!pinToBottom || !container) {
      return;
    }

    // TODO(burdon): Set when scrolled to bottom and unset when manually scrolled away.
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

  return containerRef;
};
