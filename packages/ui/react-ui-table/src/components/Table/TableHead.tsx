//
// Copyright 2023 DXOS.org
//

import { flexRender } from '@tanstack/react-table';
import React from 'react';

import { useTableContext } from './TableContext';
import { theadResizeRoot, theadRoot, theadTh, theadTr } from '../../theme';

const TABLE_HEAD_NAME = 'TableHeader';

type TableHeadProps = {};

const TableHead = (_props: TableHeadProps) => {
  const tableContext = useTableContext();
  const headerGroups = tableContext.table.getHeaderGroups();

  return (
    <thead className={theadRoot(tableContext)}>
      {headerGroups.map((headerGroup) => {
        return (
          // Group element to hover resize handles.
          <tr key={headerGroup.id} className={theadTr(tableContext)}>
            {/* TODO(burdon): Calc. width. */}
            {tableContext.debug && (
              <th className='font-mono' style={{ width: 32 }}>
                #
              </th>
            )}

            {headerGroup.headers.map((header) => {
              const isResizing = header.column.getIsResizing();
              const onResize = header.getResizeHandler();
              const resizable = header.column.columnDef.meta?.resizable;

              return (
                <th
                  key={header.id}
                  style={{
                    width: header.getSize(),
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

                  {resizable && (
                    <div
                      className={theadResizeRoot({ isResizing })}
                      onDoubleClick={header.column.resetSize} // TODO(zan): How should non-pointer users reset column sizing?
                      onMouseDown={onResize}
                      onTouchStart={onResize}
                    />
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
