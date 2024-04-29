//
// Copyright 2023 DXOS.org
//
import { type Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type GroupingState,
  type RowData,
  getGroupedRowModel,
  getExpandedRowModel,
  type Row,
} from '@tanstack/react-table';
import React, { type ComponentPropsWithoutRef, Fragment, useCallback, useEffect, useState, useContext } from 'react';

import { type ThemedClassName, useDefaultValue } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { TableBody } from './TableBody';
import { type TypedTableProvider, TableProvider as UntypedTableProvider, useTableContext } from './TableContext';
import { TableFooter } from './TableFooter';
import { TableHead } from './TableHead';
import { TableRootContext, useTableRootContext } from './TableRootContext';
import { type TableProps } from './props';
import { useColumnResizing, usePinLastRow, useRowSelection } from '../../hooks';
import { groupTh, tableRoot } from '../../theme';

type TableRootProps = { children: React.ReactNode };

const TableRoot = ({ children }: TableRootProps) => {
  const contextValue = useTableRootContext();
  return <TableRootContext.Provider value={contextValue}>{children}</TableRootContext.Provider>;
};

type TableViewportProps = ThemedClassName<ComponentPropsWithoutRef<typeof Primitive.div>> & {
  asChild?: boolean;
};

const TableViewport = ({ children, classNames, asChild, ...props }: TableViewportProps) => {
  const { scrollContextRef } = useContext(TableRootContext);

  const classes = mx(classNames);

  return asChild ? (
    <Slot ref={scrollContextRef} {...props}>
      {children}
    </Slot>
  ) : (
    <div role='none' className={classes} ref={scrollContextRef} {...props}>
      {children}
    </div>
  );
};

export const TablePrimitive = <TData extends RowData>(props: TableProps<TData>) => {
  const {
    role,
    onColumnResize,
    columnVisibility,
    header = true,
    rowsSelectable,
    debug,
    onDataSelectionChange,
    pinLastRow,
  } = props;

  const columns = useDefaultValue(props.columns, []);
  const incomingData = useDefaultValue(props.data, []);

  const [data, setData] = useState([...incomingData]);

  // Reactivity workaround: https://github.com/dxos/dxos/issues/6376.
  const forceUpdate = useCallback(() => setData([...incomingData]), [incomingData]);
  useEffect(() => forceUpdate(), [JSON.stringify(incomingData), forceUpdate]);

  const TableProvider = UntypedTableProvider as TypedTableProvider<TData>;

  const { columnSizing, setColumnSizing, columnSizingInfo, setColumnSizingInfo } = useColumnResizing({
    columns,
    onColumnResize,
  });

  const { rowSelection, handleRowSelectionChange } = useRowSelection(props);

  const [grouping, handleGroupingChange] = useState<GroupingState>(props.grouping ?? []);
  useEffect(() => handleGroupingChange(props.grouping ?? []), [handleGroupingChange, props.grouping]);

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

    // State
    state: {
      columnVisibility,
      columnSizing,
      columnSizingInfo,
      rowSelection,
      grouping,
    },

    // Resize columns
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    onColumnSizingChange: setColumnSizing,
    onColumnSizingInfoChange: setColumnSizingInfo,

    // Rows
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),

    // Grouping
    getGroupedRowModel: grouping.length > 1 ? getGroupedRowModel() : undefined,
    onGroupingChange: handleGroupingChange,

    enableMultiRowSelection: rowsSelectable === 'multi' ? true : undefined,
    enableRowSelection: rowsSelectable === true ? true : undefined,

    onRowSelectionChange: handleRowSelectionChange,

    enableSorting: true,
    enableColumnPinning: true,

    // Debug
    debugTable: debug,
  });

  useEffect(() => {
    onDataSelectionChange?.(Object.keys(rowSelection).map((id) => table.getRowModel().rowsById[id].original));
  }, [onDataSelectionChange, rowSelection, table]);

  usePinLastRow(pinLastRow, table, data);

  // Create additional expansion column if all columns have fixed width.
  const expand = false; // columns.map((column) => column.size).filter(Boolean).length === columns?.length;

  return (
    <TableProvider
      {...props}
      table={table}
      header={header}
      expand={expand}
      isGrid={role === 'grid' || role === 'treegrid'}
    >
      <TableImpl<TData> debug={false} {...props} />
    </TableProvider>
  );
};

// TODO(Zan): Smush this into the Table component.
/**
 * Pure implementation of table outside of context set-up.
 */
const TableImpl = <TData extends RowData>(props: TableProps<TData>) => {
  const { debug, classNames, role, footer, grouping, fullWidth } = props;
  const { table } = useTableContext<TData>();

  if (debug) {
    return (
      <pre className='font-mono text-xs text-neutral-500 m-1 p-2 ring'>
        <code>{JSON.stringify(table.getState(), undefined, 2)}</code>
      </pre>
    );
  }

  const isResizingColumn = table.getState().columnSizingInfo.isResizingColumn;

  const TableComponent = isResizingColumn ? MemoizedVirtualisedTableContent : VirtualizedTableContent;

  return (
    <table
      role={role}
      className={tableRoot(props, classNames)}
      {...(!fullWidth && { style: { width: table.getTotalSize() } })}
    >
      <TableHead />

      {grouping?.length !== 0 ? <TableComponent /> : <GroupedTableContent />}

      {footer && <TableFooter />}
    </table>
  );
};

const VirtualizedTableContent = () => {
  const { table } = useTableContext();
  const { virtualizer, dispatch } = useContext(TableRootContext);

  const centerRows = table.getCenterRows();
  let pinnedRows = [] as Row<unknown>[];

  useEffect(() => {
    dispatch({ type: 'updateTableCount', count: centerRows.length });
  }, [centerRows.length]);

  try {
    // TODO(zan): Work out how to sync the row pinning with rendering
    // This is a hack because the first call to this function after a row is deleted will throw an error
    // because the row index is no longer in the table
    // The pin last row hook updates the pinned row key after the row is deleted
    pinnedRows = table.getBottomRows();
  } catch (_) {} // Ignore error

  const { getTotalSize, getVirtualItems } = virtualizer;

  const virtualRows = getVirtualItems();
  const totalSize = getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0) : 0;

  const rowsToRender = [...virtualRows.map((virtualRow) => centerRows[virtualRow.index]), ...pinnedRows].filter(
    (r) => !!r,
  );

  return (
    <Fragment>
      {paddingTop > 0 && (
        <tbody role='none'>
          <tr role='none'>
            <td style={{ height: `${paddingTop}px` }} role='none' />
          </tr>
        </tbody>
      )}
      <TableBody rows={rowsToRender} />
      {paddingBottom > 0 && (
        <tbody role='none'>
          <tr role='none'>
            <td style={{ height: `${paddingBottom}px` }} role='none' />
          </tr>
        </tbody>
      )}
    </Fragment>
  );
};

export const MemoizedVirtualisedTableContent = React.memo(VirtualizedTableContent);

const GroupedTableContent = () => {
  const {
    table: { getGroupedRowModel, getHeaderGroups, getState },
    debug,
  } = useTableContext();

  return (
    <>
      {getGroupedRowModel().rows.map((row, i) => {
        return (
          <Fragment key={i}>
            {/* TODO(burdon): Customize group header renderer. */}
            <thead>
              <tr>
                {debug && <th />}
                <th
                  // TODO(burdon): Calculate row span.
                  colSpan={getHeaderGroups()[0].headers.length}
                  className={groupTh({})}
                >
                  {getState().grouping[0]}[{String(row.getGroupingValue(getState().grouping[0]))}]
                </th>
              </tr>
            </thead>
            <TableBody rows={row.subRows} />
          </Fragment>
        );
      })}
    </>
  );
};

export const Table = {
  Root: TableRoot,
  Table: TablePrimitive,
  Viewport: TableViewport,
};
