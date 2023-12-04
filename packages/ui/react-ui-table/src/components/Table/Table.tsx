//
// Copyright 2023 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import {
  getCoreRowModel,
  getGroupedRowModel,
  useReactTable,
  type ColumnSizingInfoState,
  type ColumnSizingState,
  type GroupingState,
  type RowData,
  type RowSelectionState,
  type OnChangeFn,
} from '@tanstack/react-table';
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useVirtual } from 'react-virtual';

import { debounce } from '@dxos/async';

import { TableBody } from './TableBody';
import { TableProvider as UntypedTableProvider, type TypedTableProvider } from './TableContext';
import { TableFooter } from './TableFooter';
import { TableHead } from './TableHead';
import { type TableProps } from './props';
import { groupTh, tableRoot } from '../../theme';

export const Table = <TData extends RowData>(props: TableProps<TData>) => {
  const {
    role,
    data = [],
    columns = [],
    onColumnResize,
    columnVisibility,
    header = true,
    footer,
    rowsSelectable,
    fullWidth,
    debug,
    onDataSelectionChange,
    classNames,
    containerRef,
  } = props;

  const defaultContainerRef = useRef(null);

  const TableProvider = UntypedTableProvider as TypedTableProvider<TData>;

  // Row selection
  const [rowSelection = {}, directlySetRowSelection] = useControllableState({
    prop: props.rowSelection,
    onChange: props.onRowSelectionChange,
    defaultProp: props.defaultRowSelection,
  });

  // TODO(thure): Does @tanstack/react-table really need this intervention? It did seem necessary to enforce single-selection...
  const handleRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
    (updaterOrValue) => {
      const nextRowSelection = typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection) : updaterOrValue;
      if (rowsSelectable === 'multi') {
        directlySetRowSelection(nextRowSelection);
      } else if (rowsSelectable) {
        const nextRowSelectionKey = Object.keys(nextRowSelection).filter((id) => !rowSelection[id])[0];
        directlySetRowSelection(nextRowSelectionKey ? { [nextRowSelectionKey]: true } : {});
      } else {
        directlySetRowSelection({});
      }
    },
    [rowSelection, directlySetRowSelection],
  );

  // Resizing
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>({} as ColumnSizingInfoState);
  const onColumnResizeDebounced = debounce<ColumnSizingState>((info) => onColumnResize?.(info), 500);
  useEffect(() => {
    if (columnSizingInfo.columnSizingStart?.length === 0) {
      onColumnResizeDebounced(table.getState().columnSizing);
    }
  }, [columnSizingInfo]);

  const [grouping, setGrouping] = useState<GroupingState>(props.grouping ?? []);
  useEffect(() => setGrouping(props.grouping ?? []), [props.grouping]);

  const table = useReactTable({
    // Data
    meta: {},
    data,

    // Columns
    columns,
    defaultColumn: {
      size: 256, // Required in order remove default width.
      maxSize: 1024,
    },

    // Rows
    getCoreRowModel: getCoreRowModel(),

    // State
    state: {
      columnVisibility,
      columnSizingInfo,
      rowSelection,
      grouping,
    },

    // Grouping
    getGroupedRowModel: getGroupedRowModel(),
    onGroupingChange: setGrouping,

    // Selection
    ...(rowsSelectable === 'multi'
      ? { enableMultiRowSelection: true }
      : rowsSelectable
      ? { enableRowSelection: true }
      : {}),
    onRowSelectionChange: handleRowSelectionChange,

    // Resize columns
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    onColumnSizingInfoChange: setColumnSizingInfo,

    // Debug
    debugTable: debug,
  });

  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtual({
    parentRef: containerRef ?? defaultContainerRef,
    size: rows.length,
    overscan: 10,
  });
  const { virtualItems: virtualRows, totalSize } = rowVirtualizer;

  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0) : 0;

  console.log('[p]', paddingTop, paddingBottom, virtualRows.length, rows.length);

  useEffect(() => {
    if (onDataSelectionChange) {
      onDataSelectionChange(Object.keys(rowSelection).map((id) => table.getRowModel().rowsById[id].original));
    }
  }, [onDataSelectionChange, rowSelection, table]);

  // Create additional expansion column if all columns have fixed width.
  const expand = false; // columns.map((column) => column.size).filter(Boolean).length === columns?.length;

  return (
    <TableProvider
      {...props}
      header={header}
      expand={expand}
      table={table}
      isGrid={role === 'grid' || role === 'treegrid'}
    >
      <table
        role={role}
        className={tableRoot(props, classNames)}
        {...(!fullWidth && { style: { width: table.getTotalSize() } })}
      >
        <TableHead />

        {grouping.length === 0 && (
          <>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} />
              </tr>
            )}
            <TableBody rows={virtualRows.map((virtualRow) => rows[virtualRow.index])} />
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
          </>
        )}

        {grouping.length !== 0 &&
          table.getGroupedRowModel().rows.map((row, i) => {
            return (
              <Fragment key={i}>
                {/* TODO(burdon): Customize group header renderer. */}
                <thead>
                  <tr>
                    {debug && <th />}
                    <th
                      // TODO(burdon): Calculate row span.
                      colSpan={table.getHeaderGroups()[0].headers.length}
                      className={groupTh(props)}
                    >
                      {table.getState().grouping[0]}[{String(row.getGroupingValue(table.getState().grouping[0]))}]
                    </th>
                  </tr>
                </thead>
                {/* TODO(thure): Virtualization is probably breaking this case. */}
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: `${paddingTop}px` }} />
                  </tr>
                )}
                <TableBody rows={virtualRows.map((virtualRow) => rows[virtualRow.index])} />
                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: `${paddingBottom}px` }} />
                  </tr>
                )}
              </Fragment>
            );
          })}

        {footer && <TableFooter />}
      </table>

      {debug && (
        <pre className='font-mono text-xs text-neutral-500 my-4 p-2 ring'>
          <code>{JSON.stringify(table.getState(), undefined, 2)}</code>
        </pre>
      )}
    </TableProvider>
  );
};
