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
import React, { Fragment, useEffect, useState } from 'react';

import { debounce } from '@dxos/async';

import { TableBody } from './TableBody';
import { TableProvider as UntypedTableProvider, type TypedTableProvider } from './TableContext';
import { TableFooter } from './TableFooter';
import { TableHead } from './TableHead';
import { type TableProps } from './props';
import { groupTh, tableRoot } from '../../theme';

export const Table = <TData extends RowData>(props: TableProps<TData>) => {
  const {
    data = [],
    columns = [],
    onColumnResize,
    columnVisibility,
    header = true,
    footer,
    rowsSelectable,
    fullWidth,
    debug,
  } = props;

  const TableProvider = UntypedTableProvider as TypedTableProvider<TData>;

  // Row selection
  const [rowSelection = {}, setRowSelection] = useControllableState({
    prop: props.rowSelection,
    onChange: props.onRowSelectionChange,
    defaultProp: props.defaultRowSelection,
  });

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
    onRowSelectionChange: setRowSelection as OnChangeFn<RowSelectionState>,

    // Resize columns
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    onColumnSizingInfoChange: setColumnSizingInfo,

    // Debug
    debugTable: debug,
  });

  // Create additional expansion column if all columns have fixed width.
  const expand = false; // columns.map((column) => column.size).filter(Boolean).length === columns?.length;

  return (
    <TableProvider {...props} header={header} expand={expand} table={table}>
      <table className={tableRoot(props)} style={{ width: fullWidth ? '100%' : table.getTotalSize() }}>
        <TableHead />

        {grouping.length === 0 && <TableBody rows={table.getRowModel().rows} />}

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

                <TableBody rows={row.subRows} />
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
