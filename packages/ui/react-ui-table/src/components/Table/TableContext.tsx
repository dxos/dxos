//
// Copyright 2024 DXOS.org
//

import { type RowData } from '@tanstack/react-table';
import React, { useContext, createContext, type ReactNode, type FC, type Context } from 'react';

import { type TableContextValue } from './props';

export const TABLE_NAME = 'Table';

// Create the context without a default value.
// The expectation is that the provider will always supply a value, so no need to define a default here.
const TableContext = createContext<TableContextValue<RowData>>({} as TableContextValue<RowData>);

export type TypedTableProvider<TData extends RowData> = {
  (props: TableContextValue<TData> & { children: ReactNode }): JSX.Element;
  displayName: string;
};

export const TableProvider: FC<TableContextValue<RowData> & { children: ReactNode }> = ({ children, ...value }) => {
  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
};

// Create a custom hook to consume the context.
export const useTableContext = <TData extends RowData>(): TableContextValue<TData> => {
  return useContext(TableContext as Context<TableContextValue<TData>>);
};
