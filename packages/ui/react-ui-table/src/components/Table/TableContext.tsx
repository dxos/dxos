//
// Copyright 2023 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { type RowData } from '@tanstack/react-table';
import { type ReactNode } from 'react';

import { type TableContextValue } from './props';

export const TABLE_NAME = 'Table';

type CreateContextResult<TData extends RowData> = Readonly<
  [TypedTableProvider<unknown>, (consumerName: string) => TableContextValue<TData>]
>;

export type TypedTableProvider<TData extends RowData> = {
  (props: TableContextValue<TData> & { children: ReactNode }): JSX.Element;
  displayName: string;
};

const [TableProvider, useUntypedTableContext]: CreateContextResult<unknown> =
  createContext<TableContextValue<unknown>>(TABLE_NAME);

export const useTableContext = <TData extends RowData>(consumerName: string) =>
  useUntypedTableContext(consumerName) as TableContextValue<TData>;

export { TableProvider };
