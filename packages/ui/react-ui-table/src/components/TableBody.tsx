//
// Copyright 2023 DXOS.org
//

import { flexRender, type Row, type RowData, type RowSelectionState } from '@tanstack/react-table';
import React from 'react';

import { type TableProps } from './Table';
import { selectedRow, tdRoot, tbodyTr } from '../theme';

export type TableBodyProps<TData extends RowData> = Partial<TableProps<TData>> & {
  rows: Row<TData>[];
  rowSelection?: RowSelectionState;
  expand?: boolean;
};

export const TableBody = <TData extends RowData>(props: TableBodyProps<TData>) => {
  const { keyAccessor, rows, rowSelection, debug, expand } = props;
  return (
    <tbody>
      {rows.map((row) => {
        return (
          <tr
            key={keyAccessor ? keyAccessor(row.original) : row.id}
            className={tbodyTr(props, rowSelection?.[row.id] && selectedRow)}
          >
            {debug && <td>{row.id}</td>}

            {row.getVisibleCells().map((cell) => {
              // TODO(burdon): Allow class override from column.
              return (
                <td key={cell.id} className={tdRoot(props, cell.column.columnDef.meta?.slots?.cell?.className)}>
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
