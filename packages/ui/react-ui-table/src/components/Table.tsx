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
  type VisibilityState,
  type OnChangeFn,
} from '@tanstack/react-table';
import React, { Fragment, useEffect, useState } from 'react';

import { debounce } from '@dxos/async';

import { TableBody } from './TableBody';
import { TableFooter } from './TableFooter';
import { TableHead } from './TableHead';
import { groupTh, tableRoot } from '../theme';
import { type TableColumnDef, type KeyValue } from '../types';

export type TableRowSelectionState = Partial<{
  rowsSelectable: boolean | 'multi';
  rowSelection: RowSelectionState;
  defaultRowSelection: RowSelectionState;
  onRowSelectionChange: (rowSelection: RowSelectionState) => void;
}>;

export type TableProps<TData extends RowData> = {
  keyAccessor?: KeyValue<TData>;
  data?: TData[];
  columns?: TableColumnDef<TData>[];
  columnVisibility?: VisibilityState;
  onColumnResize?: (state: Record<string, number>) => void;
  grouping?: string[];
  header?: boolean;
  footer?: boolean;
  border?: boolean;
  fullWidth?: boolean;
  debug?: boolean;
} & TableRowSelectionState;

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

  // Selection
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
      size: 400, // Required in order remove default width.
      maxSize: 800,
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
    <>
      <table className={tableRoot(props)} style={{ width: fullWidth ? '100%' : table.getTotalSize() }}>
        <TableHead {...props} header={header} state={table.getState()} headers={table.getHeaderGroups()} />

        {grouping.length === 0 && (
          <TableBody {...props} rowSelection={rowSelection} expand={expand} rows={table.getRowModel().rows} />
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

                <TableBody {...props} rowSelection={rowSelection} expand={expand} rows={row.subRows} />
              </Fragment>
            );
          })}

        {footer && <TableFooter {...props} footers={table.getFooterGroups()} />}
      </table>

      {debug && (
        <pre className='font-mono text-xs text-neutral-500 my-4 p-2 ring'>
          <code>{JSON.stringify(table.getState(), undefined, 2)}</code>
        </pre>
      )}
    </>
  );
};
