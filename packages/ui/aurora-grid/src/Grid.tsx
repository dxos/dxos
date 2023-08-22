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
} from '@tanstack/react-table';
import React, { useEffect, useRef, useState } from 'react';

import { mx } from '@dxos/aurora-theme';

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

type GridSelection<TData extends RowData> = {
  // Controlled if undefined (by default).
  select?: 'single' | 'single-toggle' | 'multiple' | 'multiple-toggle' | undefined;
  selected?: TData | TData[];
  onSelectedChange?: (rows: TData | TData[] | undefined) => void;
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

export type GridProps<TData extends RowData> = {
  columns?: GridColumnDef<TData>[];
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
  columns = [],
  data = [],
  slots,
  select,
  selected,
  onSelectedChange,
  header: showHeader = true,
  footer: showFooter = false,
  pinToBottom,
}: GridProps<TData>) => {
  // https://tanstack.com/table/v8/docs/api/features/row-selection
  const [selectionState, setSelectionState] = useState<RowSelectionState>({});
  const [focus, setFocus] = useState<string>();

  // https://tanstack.com/table/v8/docs/api/core/table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      rowSelection: selectionState,
    },
    enableRowSelection: select === 'single' || select === 'single-toggle',
    enableMultiRowSelection: select === 'multiple' || select === 'multiple-toggle',
    onRowSelectionChange: (rows) => {
      console.log('onRowSelectionChange', rows);
    },
    // debugTable: true, // TODO(burdon): Research perf for us.
  });

  // Update controlled selection.
  useEffect(() => {
    if (Array.isArray(selected)) {
      setSelectionState(
        selected.reduce((selectionState: RowSelectionState, selected) => {
          const row = table.getRowModel().rows.find((row) => row.original === selected);
          if (row) {
            selectionState[row.id] = true;
          }
          return selectionState;
        }, {}),
      );
    } else {
      const row = selected && table.getRowModel().rows.find((row) => row.original === selected);
      if (row) {
        setSelectionState({ [row.id]: true });
      } else {
        setSelectionState({});
      }
    }
  }, [select, selected]);

  const handleSelect = (row: Row<TData>) => {
    setSelectionState((selectionState: RowSelectionState) => {
      const newSelectionState = updateSelection(selectionState, row.id, select);
      if (onSelectedChange) {
        const rows: TData[] = Object.keys(newSelectionState).map((id) => table.getRowModel().rowsById[id].original);
        if (select === 'single' || select === 'single-toggle') {
          onSelectedChange(rows?.[0]);
        } else {
          onSelectedChange(rows);
        }
      }

      return newSelectionState;
    });
  };

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

  // TODO(burdon): Use meta prop for visibility.

  // TODO(burdon): Use radix ScrollArea.
  // https://www.radix-ui.com/primitives/docs/components/scroll-area
  return (
    <div ref={containerRef} className={mx('grow overflow-auto', slots?.root?.className)}>
      <table className='table-fixed w-full'>
        {/* TODO(burdon): Must have header group for widths. */}
        <thead className={mx(showHeader ? ['sticky top-0 z-10', slots?.header?.className] : 'collapse')}>
          {table.getHeaderGroups().map((headerGroup) => {
            // Need additional column if all columns have fixed width.
            // TODO(burdon): Size will be computed.
            const addFlex = columns.map((column) => column.size).filter(Boolean).length === columns?.length;

            return (
              <tr key={headerGroup.id}>
                <th style={{ width: slots?.margin?.style?.width }} />
                {headerGroup.headers
                  // .filter((header) => !getColumn(header.id).hidden)
                  .map((header) => {
                    return (
                      <th
                        key={header.id}
                        style={{ width: header.column.columnDef.size }}
                        className={mx(slots?.cell?.className)}
                      >
                        {!showHeader || header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  })}
                {addFlex && <th />}
                <th style={{ width: slots?.margin?.style?.width }} />
              </tr>
            );
          })}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            return (
              <tr
                key={row.id}
                onClick={() => handleSelect(row)}
                role='button'
                className={mx(
                  'group',
                  slots?.row?.className,
                  selectionState[row.id] && slots?.selected?.className,
                  focus === row.id && slots?.focus?.className,
                )}
              >
                <td>
                  {/* Dummy button for focus. */}
                  <button
                    style={{ width: 1 }}
                    className='focus:outline-none'
                    onFocus={() => setFocus(row.id)}
                    onBlur={() => setFocus(undefined)}
                  />
                </td>
                {row
                  .getVisibleCells()
                  // .filter((cell) => !getColumn(cell.column.id).hidden)
                  .map((cell) => {
                    return (
                      <td key={cell.id} className={mx('truncate', slots?.cell?.className)}>
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
