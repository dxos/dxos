//
// Copyright 2023 DXOS.org
//

import {
  flexRender,
  getCoreRowModel,
  getGroupedRowModel,
  useReactTable,
  type ColumnSizingInfoState,
  type ColumnSizingState,
  type GroupingState,
  type HeaderGroup,
  type Row,
  type RowData,
  type RowSelectionState,
  type TableState,
  type VisibilityState,
} from '@tanstack/react-table';
import React, { Fragment, useEffect, useState } from 'react';

import { debounce } from '@dxos/async';
import { insetStaticFocusRing, mx } from '@dxos/react-ui-theme';

import {
  groupTh,
  selectedRow,
  tableRoot,
  tbodyTd,
  tbodyTr,
  tfootRoot,
  tfootRow,
  tfootTh,
  theadResizeRoot,
  theadResizeThumb,
  theadRoot,
  theadTh,
  theadTr,
} from '../theme';
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
  const [focus, setFocus] = useState<string>();
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
            focus={focus}
            onFocus={setFocus}
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
                  focus={focus}
                  onFocus={setFocus}
                  onSelect={handleSelect}
                  rows={row.subRows}
                />
              </Fragment>
            );
          })}

        {/* Foot */}
        {footer && <TableFoot {...props} footers={table.getFooterGroups()} />}
      </table>

      {debug && (
        <pre className='font-mono text-xs text-neutral-500 my-4 p-2 ring'>
          <code>{JSON.stringify(table.getState(), undefined, 2)}</code>
        </pre>
      )}
    </>
  );
};

//
// Head.
//

export type TableHeadProps<TData extends RowData> = Partial<TableProps<TData>> & {
  state: TableState;
  headers: HeaderGroup<TData>[];
  expand?: boolean;
};

const TableHead = <TData extends RowData>(props: TableHeadProps<TData>) => {
  const { state, headers, expand, debug, fullWidth } = props;
  return (
    <thead className={theadRoot(props)}>
      {headers.map((headerGroup) => {
        return (
          // Group element to hover resize handles.
          <tr key={headerGroup.id} className={theadTr(props)}>
            {/* TODO(burdon): Calc. width. */}
            {debug && (
              <th className='font-system-light' style={{ width: 32 }}>
                #
              </th>
            )}

            {headerGroup.headers.map((header) => {
              const isResizing = header.column.getIsResizing();
              return (
                <th
                  key={header.id}
                  style={{
                    // Don't set width if fullWidth and no extrinsic size.
                    width: fullWidth && header.column.columnDef.meta?.expand ? undefined : header.getSize(),
                  }}
                  className={theadTh(props, header.column.columnDef.meta?.slots?.header?.className)}
                >
                  {!header || header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}

                  {/*
                   * Resize handle.
                   * https://codesandbox.io/p/sandbox/github/tanstack/table/tree/main/examples/react/column-sizing
                   */}
                  {header.column.columnDef.meta?.resizable && (
                    <div
                      className={theadResizeRoot(props, isResizing && 'hidden')}
                      style={{
                        transform: `translateX(${isResizing ? state.columnSizingInfo.deltaOffset : 0}px)`,
                      }}
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                    >
                      <div className={mx(theadResizeThumb(props))} />
                    </div>
                  )}
                </th>
              );
            })}
            {expand && <th />}
          </tr>
        );
      })}
    </thead>
  );
};

//
// Body.
//

export type TableBodyProps<TData extends RowData> = Partial<TableProps<TData>> & {
  rows: Row<TData>[];
  rowSelection: RowSelectionState;
  expand?: boolean;
  focus?: string;
  onFocus?: (id?: string) => void;
  onSelect?: (row: Row<TData>) => void;
};

const TableBody = <TData extends RowData>(props: TableBodyProps<TData>) => {
  const { keyAccessor, rows, rowSelection, focus, onSelect, debug, expand } = props;
  return (
    <tbody>
      {rows.map((row) => {
        return (
          <tr
            key={keyAccessor ? keyAccessor(row.original) : row.id}
            onClick={() => onSelect?.(row)}
            className={tbodyTr(props, rowSelection[row.id] && selectedRow, focus === row.id && insetStaticFocusRing)}
          >
            {debug && <td>{row.id}</td>}

            {row.getVisibleCells().map((cell) => {
              // TODO(burdon): Allow class override from column.
              return (
                <td key={cell.id} className={tbodyTd(props, cell.column.columnDef.meta?.slots?.cell?.className)}>
                  {flexRender(cell.column.columnDef.cell, { className: 'pli-2', ...cell.getContext() })}
                </td>
              );
            })}

            {expand && <td />}
          </tr>
        );
      })}
    </tbody>
  );
};

//
// Footer
//

export type TableFootProps<TData extends RowData> = Partial<TableProps<TData>> & {
  footers: HeaderGroup<TData>[];
  expand?: boolean;
};

const TableFoot = <TData extends RowData>(props: TableFootProps<TData>) => {
  const { footers, expand, debug } = props;
  return (
    <tfoot className={tfootRoot(props)}>
      {footers.map((footerGroup) => (
        <tr key={footerGroup.id} className={tfootRow(props)}>
          {debug && <th />}

          {footerGroup.headers.map((footer) => {
            return (
              <th key={footer.id} className={tfootTh(props, footer.column.columnDef.meta?.slots?.footer?.className)}>
                {footer.isPlaceholder ? null : flexRender(footer.column.columnDef.footer, footer.getContext())}
              </th>
            );
          })}

          {expand && <th />}
        </tr>
      ))}
    </tfoot>
  );
};
