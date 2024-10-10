//
// Copyright 2024 DXOS.org
//

import { type RowData } from '@tanstack/react-table';
import React, {
  useContext,
  createContext,
  type Context,
  type JSX,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

import { raise } from '@dxos/debug';

import { type TableContextValue } from './props';

export const TABLE_NAME = 'Table';

const TableContext = createContext<TableContextValue<RowData> | undefined>(undefined);

export type TypedTableProvider<TData extends RowData> = {
  (props: TableContextValue<TData> & { children: ReactNode }): JSX.Element;
  displayName: string;
};

export const TableProvider = ({ children, ...value }: PropsWithChildren<TableContextValue<RowData>>) => {
  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
};

export const useTableContext = <TData extends RowData>(): TableContextValue<TData> => {
  return useContext(TableContext as Context<TableContextValue<TData>>) ?? raise(new Error('Missing TableContext'));
};
