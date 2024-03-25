//
// Copyright 2023 DXOS.org
//

import { useFocusableGroup } from '@fluentui/react-tabster';
import { type Cell as CellType, type RowData } from '@tanstack/react-table';
import React, { type PropsWithChildren } from 'react';

import { tdRoot } from '../../theme';
import { useTableContext } from '../Table/TableContext';

type CellProps<TData extends RowData, TValue> = PropsWithChildren<{
  cell: CellType<TData, TValue>;
}>;

const CELL_NAME = 'Cell';

const FocusableCell = <TData extends RowData, TValue>({ cell, children }: CellProps<TData, TValue>) => {
  const tableContext = useTableContext();
  const domAttributes = useFocusableGroup({ tabBehavior: 'limited' });

  const className = tdRoot(tableContext, cell.column.columnDef.meta?.cell?.classNames);

  return (
    <td tabIndex={0} {...domAttributes} className={className}>
      {children}
    </td>
  );
};

const StaticCell = <TData extends RowData, TValue>({ cell, children }: CellProps<TData, TValue>) => {
  const tableContext = useTableContext();
  return <td className={tdRoot(tableContext, cell.column.columnDef.meta?.cell?.classNames)}>{children}</td>;
};

const Cell = <TData extends RowData, TValue>({ cell, children }: CellProps<TData, TValue>) => {
  const { isGrid } = useTableContext();
  const Root = isGrid ? FocusableCell : StaticCell;
  return <Root cell={cell}>{children}</Root>;
};

Cell.displayName = CELL_NAME;

export { Cell };

export type { CellProps };
