//
// Copyright 2023 DXOS.org
//

import { flexRender, type Row, type RowData } from '@tanstack/react-table';
import React from 'react';

import { useTableContext } from './TableContext';
import { selectedRow, tdRoot, tbodyTr } from '../../theme';

type TableBodyProps<TData extends RowData> = {
  rows: Row<TData>[];
};

const TABLE_BODY_NAME = 'TableBody';

const TableBody = <TData extends RowData>({ rows }: TableBodyProps<TData>) => {
  const tableContext = useTableContext<TData>(TABLE_BODY_NAME);
  const { table, keyAccessor, debug, expand } = tableContext;
  const rowSelection = table.getState().rowSelection;
  return (
    <tbody>
      {rows.map((row) => {
        return (
          <tr
            key={keyAccessor ? keyAccessor(row.original) : row.id}
            className={tbodyTr(tableContext, rowSelection?.[row.id] && selectedRow)}
          >
            {debug && <td>{row.id}</td>}

            {row.getVisibleCells().map((cell) => {
              return (
                <td key={cell.id} className={tdRoot(tableContext, cell.column.columnDef.meta?.cell?.classNames)}>
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

TableBody.displayName = TABLE_BODY_NAME;

export { TableBody };

export type { TableBodyProps };
