//
// Copyright 2023 DXOS.org
//

import {
  getCoreRowModel,
  getGroupedRowModel,
  useReactTable,
  type ColumnSizingInfoState,
  type ColumnSizingState,
  type GroupingState,
  type Row,
  type RowData,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import React, { Fragment, useEffect, useState } from 'react';

import { debounce } from '@dxos/async';

import { TableBody } from './TableBody';
import { TableFooter } from './TableFooter';
import { TableHead } from './TableHead';
import { groupTh, tableRoot } from '../theme';
import { type TableColumnDef, type KeyValue } from '../types';

// TODO(burdon): Sort/filter.
// TODO(burdon): Drag-and-drop.
// TODO(burdon): Virtual (e.g., log panel).

export type TableSelection<TData extends RowData> = {
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
  selection: TableSelection<any>['select'],
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
} & TableSelection<TData>;

export const Table = <TData extends RowData>(props: TableProps<TData>) => {
  const {
    data = [],
    columns = [],
    onColumnResize,
    columnVisibility,
    header = true,
    footer,
    select,
    selected,
    onSelectedChange,
    fullWidth,
    debug,
  } = props;

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
  const onColumnResizeDebounced = debounce<ColumnSizingState>((info) => onColumnResize?.(info), 500);
  useEffect(() => {
    if (columnSizingInfo.columnSizingStart?.length === 0) {
      onColumnResizeDebounced(table.getState().columnSizing);
    }
  }, [columnSizingInfo]);

  const [grouping, setGrouping] = useState<GroupingState>(props.grouping ?? []);
  useEffect(() => setGrouping(props.grouping ?? []), [props.grouping]);

  //
  // Update table state.
  // https://tanstack.com/table/v8/docs/api/core/table
  //
  const table = useReactTable({
    data,
    columns,
    defaultColumn: {
      size: 400, // Required in order remove default width.
      maxSize: 800,
    },
    getCoreRowModel: getCoreRowModel(),
    meta: {},

    // TODO(burdon): Pagination.
    // TODO(burdon): Sorting.
    // TODO(burdon): Filtering.
    state: {
      columnVisibility,
      columnSizingInfo,
      rowSelection,
      grouping,
    },

    // Grouping.
    getGroupedRowModel: getGroupedRowModel(),
    onGroupingChange: setGrouping,

    // Selection.
    enableRowSelection: select === 'single' || select === 'single-toggle',
    enableMultiRowSelection: select === 'multiple' || select === 'multiple-toggle',
    onRowSelectionChange: (rows) => {
      setRowSelection(rows);
    },

    // Resize columns.
    // TODO(burdon): Drag to re-order columns.
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    onColumnSizingInfoChange: setColumnSizingInfo,

    debugTable: debug,
  });

  // TODO(burdon): Add flex if not resizable.
  // Create additional expansion column if all columns have fixed width.
  const expand = false; // columns.map((column) => column.size).filter(Boolean).length === columns?.length;

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

  return (
    <>
      <table className={tableRoot(props)} style={{ width: fullWidth ? '100%' : table.getTotalSize() }}>
        <TableHead {...props} header={header} state={table.getState()} headers={table.getHeaderGroups()} />

        {grouping.length === 0 && (
          <TableBody
            {...props}
            rowSelection={rowSelection}
            expand={expand}
            onSelect={handleSelect}
            rows={table.getRowModel().rows}
          />
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

                <TableBody
                  {...props}
                  rowSelection={rowSelection}
                  expand={expand}
                  onSelect={handleSelect}
                  rows={row.subRows}
                />
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
