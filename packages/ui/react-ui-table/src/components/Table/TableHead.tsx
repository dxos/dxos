//
// Copyright 2023 DXOS.org
//

import { flexRender, type RowData } from '@tanstack/react-table';
import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import { useTableContext } from './TableContext';
import { theadResizeRoot, theadResizeThumb, theadRoot, theadTh, theadTr } from '../../theme';

const TABLE_HEAD_NAME = 'TableHead';

type TableHeadProps = {};

const TableHead = <TData extends RowData>(_props: TableHeadProps) => {
  const tableContext = useTableContext<TData>(TABLE_HEAD_NAME);
  const headerGroups = tableContext.table.getHeaderGroups();
  const state = tableContext.table.getState();
  return (
    <thead className={theadRoot(tableContext)}>
      {headerGroups.map((headerGroup) => {
        return (
          // Group element to hover resize handles.
          <tr key={headerGroup.id} className={theadTr(tableContext)}>
            {/* TODO(burdon): Calc. width. */}
            {tableContext.debug && (
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
                    width:
                      tableContext.fullWidth && header.column.columnDef.meta?.expand ? undefined : header.getSize(),
                  }}
                  className={theadTh(tableContext, header.column.columnDef.meta?.header?.classNames)}
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
                      className={theadResizeRoot(tableContext, isResizing && 'hidden')}
                      style={{
                        transform: `translateX(${isResizing ? state.columnSizingInfo.deltaOffset : 0}px)`,
                      }}
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                    >
                      <div className={mx(theadResizeThumb(tableContext))} />
                    </div>
                  )}
                </th>
              );
            })}
            {tableContext.expand && <th />}
          </tr>
        );
      })}
    </thead>
  );
};

TableHead.displayName = TABLE_HEAD_NAME;

export { TableHead };

export type { TableHeadProps };
