//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { flexRender, type Row, type RowData } from '@tanstack/react-table';
import React from 'react';

import { useTableContext } from './TableContext';
import { tbodyTr } from '../../theme';
import { Cell } from '../Cell/Cell';

type TableBodyProps<TData extends RowData> = {
  rows: Row<TData>[];
};

const TABLE_BODY_NAME = 'TableBody';

const TableBody = <TData extends RowData>({ rows }: TableBodyProps<TData>) => {
  const tableContext = useTableContext<TData>(TABLE_BODY_NAME);
  const { table, keyAccessor, debug, expand, isGrid, onDatumClick, currentDatum } = tableContext;
  const rowSelection = table.getState().rowSelection;
  const domAttributes = useArrowNavigationGroup({ axis: 'grid' });
  const canBeCurrent = !isGrid && !!onDatumClick;
  return (
    <tbody {...(isGrid && domAttributes)}>
      {rows.map((row) => {
        const isCurrent = currentDatum === row.original;
        const isSelected = rowSelection?.[row.id];
        return (
          <tr
            key={keyAccessor ? keyAccessor(row.original) : row.id}
            className={tbodyTr({ isSelected, isCurrent, canBeCurrent })}
            {...(isCurrent && { 'aria-current': 'location' })}
            {...(canBeCurrent && {
              tabIndex: 0,
              onClick: () => {
                onDatumClick(row.original);
              },
            })}
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
