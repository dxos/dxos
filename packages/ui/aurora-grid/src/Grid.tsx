//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import {
  ColumnDef,
  Row,
  RowData,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { defaultGridSlots } from './theme';

// Meta definition.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface TableMeta<TData extends RowData> {}

  // eslint-disable-next-line unused-imports/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    resize?: boolean;
    menu?: boolean;
  }
}

export type GridColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<TData, TValue>;

// TODO(burdon): Editable.
// TODO(burdon): Sort/filter.
// TODO(burdon): Scroll to selection; sticky bottom.
// TODO(burdon): Drag-and-drop.
// TODO(burdon): Virtual (e.g., log panel).
// TODO(burdon): Resize.

// TODO(burdon): Remove nested classNames? Add to theme?
export type GridSlots = {
  root?: {
    className?: string | string[];
  };
  table?: {
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
    className?: string | string[];
  };
};

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
  size: undefined, // NOTE: Required in order remove default width.
};

export type GridProps<TData extends RowData> = {
  columns?: GridColumnDef<TData>[];
  columnVisibility?: VisibilityState;
  data?: TData[];
  slots?: GridSlots;
  header?: boolean;
  footer?: boolean;
  pinToBottom?: boolean;
  debug?: boolean;
} & GridSelection<TData>;

/**
 * Simple table.
 */
export const Grid = <TData extends RowData>({
  columns = [],
  data = [],
  columnVisibility,
  slots = defaultGridSlots,
  select,
  selected,
  onSelectedChange,
  header: showHeader = true,
  footer: showFooter = false,
  pinToBottom,
  debug,
}: GridProps<TData>) => {
  const [focus, setFocus] = useState<string>();

  // Update controlled selection.
  // https://tanstack.com/table/v8/docs/api/features/row-selection
  const [selectionState, setSelectionState] = useState<RowSelectionState>({});
  useEffect(() => {
    setSelectionState(
      selected?.reduce((selectionState: RowSelectionState, selected) => {
        const row = table.getRowModel().rows.find((row) => row.original === selected);
        if (row) {
          selectionState[row.id] = true;
        }
        return selectionState;
      }, {}) ?? {},
    );
  }, [select, selected]);

  // Update table model.
  // https://tanstack.com/table/v8/docs/api/core/table
  const table = useReactTable({
    data,
    columns,
    defaultColumn: defaultColumn as Partial<ColumnDef<TData>>,
    getCoreRowModel: getCoreRowModel(),

    // TODO(burdon): Pagination.
    // TODO(burdon): Sorting.
    // TODO(burdon): Filtering.
    state: {
      columnVisibility,
      rowSelection: selectionState,
    },

    enableRowSelection: select === 'single' || select === 'single-toggle',
    enableMultiRowSelection: select === 'multiple' || select === 'multiple-toggle',
    onRowSelectionChange: (rows) => {
      setSelectionState(rows);
    },

    // TODO(burdon): Drag to re-order columns.
    columnResizeMode: 'onChange',
    enableColumnResizing: true,

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
      setSelectionState((selectionState: RowSelectionState) => {
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

  // TODO(burdon): Use radix ScrollArea.
  // https://www.radix-ui.com/primitives/docs/components/scroll-area
  return (
    <div ref={containerRef} className={mx('grow overflow-auto', slots?.root?.className)}>
      <table
        className={mx('w-fit border-collapse', slots?.table?.className)}
        style={{
          width: table.getCenterTotalSize(),
        }}
      >
        {/*
         * Header
         */}
        <thead className={mx(showHeader ? ['sticky top-0 z-10', slots?.header?.className] : 'collapse')}>
          {table.getHeaderGroups().map((headerGroup) => {
            return (
              <tr key={headerGroup.id} className='flex w-fit items-center'>
                <th className={mx(slots?.margin?.className)} />

                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className={mx('flex items-center relative', slots?.cell?.className)}
                    >
                      {!showHeader || header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}

                      {/* TODO(burdon): Provide helper for renderer. */}
                      {header.column.columnDef.meta?.menu && (
                        <>
                          <div className='grow' />
                          <Button variant='ghost'>
                            <DotsThreeVertical className={getSize(5)} />
                          </Button>
                        </>
                      )}

                      {/*
                       * Resize handle.
                       * https://codesandbox.io/p/sandbox/github/tanstack/table/tree/main/examples/react/column-sizing
                       */}
                      {header.column.columnDef.meta?.resize && (
                        <div
                          className={mx(
                            'absolute right-0 top-0 px-1 h-full',
                            'cursor-col-resize select-none touch-none opacity-20 hover:opacity-100',
                            // TODO(burdon): Hidden due to render bug while dragging.
                            header.column.getIsResizing() && 'hidden',
                          )}
                          style={{
                            transform: header.column.getIsResizing()
                              ? `translateX(${table.getState().columnSizingInfo.deltaOffset}px)`
                              : undefined,
                          }}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          // TODO(burdon): Update size.
                          onMouseUp={() => console.log('stop')}
                          onTouchEnd={() => console.log('stop')}
                        >
                          <div className='flex border-r border-neutral-300 w-[1px] h-full' />
                        </div>
                      )}
                    </th>
                  );
                })}

                {addFlex && <th />}
                <th className={mx(slots?.margin?.className)} />
              </tr>
            );
          })}
        </thead>

        {/*
         * Body
         */}
        <tbody>
          {table.getRowModel().rows.map((row) => {
            return (
              <tr
                key={row.id}
                onClick={() => handleSelect(row)}
                role='button'
                className={mx(
                  'flex w-fit items-center group',
                  selectionState[row.id] && slots?.selected?.className,
                  focus === row.id && slots?.focus?.className,
                  slots?.row?.className,
                )}
              >
                <td className={mx(slots?.margin?.className)}>
                  {/* Dummy button for focus. */}
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

                {row.getVisibleCells().map((cell) => {
                  return (
                    <td
                      key={cell.id}
                      className={mx('flex items-center overflow-hidden', slots?.cell?.className)}
                      style={{
                        width: cell.column.getSize(),
                      }}
                    >
                      <div className='grow pr-2'>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                    </td>
                  );
                })}

                {addFlex && <td />}
                <td className={mx(slots?.margin?.className)} />
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
              <tr key={footerGroup.id} className='flex w-fit items-center'>
                <th className={mx(slots?.margin?.className)} />

                {footerGroup.headers.map((footer) => {
                  return (
                    <th key={footer.id} className={mx(slots?.footer?.className)}>
                      {footer.isPlaceholder ? null : flexRender(footer.column.columnDef.footer, footer.getContext())}
                    </th>
                  );
                })}

                {addFlex && <th />}
                <th className={mx(slots?.margin?.className)} />
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
