//
// Copyright 2023 DXOS.org
//

import { flexRender, type HeaderGroup, type RowData, type TableState } from '@tanstack/react-table';
import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import { type TableProps } from './Table';
import { theadResizeRoot, theadResizeThumb, theadRoot, theadTh, theadTr } from '../theme';

export type TableHeadProps<TData extends RowData> = Partial<TableProps<TData>> & {
  state: TableState;
  headers: HeaderGroup<TData>[];
  expand?: boolean;
};

export const TableHead = <TData extends RowData>(props: TableHeadProps<TData>) => {
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
