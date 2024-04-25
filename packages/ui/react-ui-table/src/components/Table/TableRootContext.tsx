//
// Copyright 2024 DXOS.org
//

import React, { useContext, createContext, type ReactNode } from 'react';

type TableRootContextValue = {
  scrollContextRef: React.RefObject<HTMLDivElement>;
};

// Create the context without a default value.
// The expectation is that the provider will always supply a value, so no need to define a default here.
const TableContext = createContext<TableRootContextValue>({} as TableRootContextValue);

export const TableRootProvider: React.FC<TableRootContextValue & { children: ReactNode }> = ({
  children,
  ...value
}) => {
  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
};

// Create a custom hook to consume the context
export const useTableRootContext = (): TableRootContextValue => {
  const context = useContext(TableContext as React.Context<TableRootContextValue>);
  return context;
};
