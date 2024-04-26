//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { flexRender, type Row, type RowData } from '@tanstack/react-table';
import React, { useContext } from 'react';

import { useTableContext } from './TableContext';
import { TableRootContext } from './TableRootContext';
import { tbodyTr } from '../../theme';
import { Cell } from '../Cell/Cell';

const TABLE_BODY_NAME = 'TableBody';

type TableBodyProps = {
  rows: Row<RowData>[];
};

const TableBody = ({ rows }: TableBodyProps) => {
  const { table, keyAccessor, currentDatum, debug, expand, isGrid, onDatumClick } = useTableContext();

  const rowSelection = table.getState().rowSelection;
  const domAttributes = useArrowNavigationGroup({ axis: 'grid' });
  const canBeCurrent = !isGrid && !!onDatumClick;

  const { virtualizer } = useContext(TableRootContext);

  return (
    <tbody {...(isGrid && domAttributes)}>
      {rows
        .filter((row) => !!row)
        .map((row) => {
          const isCurrent = currentDatum === row.original;
          const isSelected = rowSelection?.[row.id];

          const isPinned = row.getIsPinned();

          const classNames = tbodyTr({ canBeCurrent, isPinned: isPinned !== false });

          return (
            <tr
              key={keyAccessor ? keyAccessor(row.original) : row.id}
              className={classNames}
              data-index={row.index}
              ref={virtualizer.measureElement}
              {...(isCurrent && { 'aria-current': 'location' })}
              {...(isSelected && { 'aria-selected': 'true' })}
              {...(canBeCurrent && {
                tabIndex: 0,
                onClick: () => {
                  onDatumClick(row.original);
                },
                onKeyUp: ({ key }) => {
                  if (key === 'Enter' || key === ' ') {
                    onDatumClick(row.original);
                  }
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
