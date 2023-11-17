//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { flexRender, type Row, type RowData } from '@tanstack/react-table';
import React from 'react';

import { useTableContext } from './TableContext';
import { selectedRow, tbodyTr } from '../../theme';
import { Cell } from '../Cell/Cell';

type TableBodyProps<TData extends RowData> = {
  rows: Row<TData>[];
};

const TABLE_BODY_NAME = 'TableBody';

const TableBody = <TData extends RowData>({ rows }: TableBodyProps<TData>) => {
  const tableContext = useTableContext<TData>(TABLE_BODY_NAME);
  const { table, keyAccessor, debug, expand, isGrid } = tableContext;
  const rowSelection = table.getState().rowSelection;
  const domAttributes = useArrowNavigationGroup({ axis: 'grid' });
  return (
    <tbody {...(isGrid && domAttributes)}>
      {rows.map((row) => {
        return (
          <tr
            key={keyAccessor ? keyAccessor(row.original) : row.id}
            className={tbodyTr(tableContext, rowSelection?.[row.id] && selectedRow)}
          >
            {debug && <td>{row.id}</td>}

            {row.getVisibleCells().map((cell) => {
              return (
                <Cell key={cell.id} cell={cell}>
                  {flexRender(cell.column.columnDef.cell, { className: 'pli-2', ...cell.getContext() })}
                </Cell>
              );
            })}

            {expand && <td />}
          </tr>
        );
      })}
    </tbody>
  );
};

TableBody.displayName = TABLE_BODY_NAME;

export { TableBody };

export type { TableBodyProps };
