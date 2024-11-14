//
// Copyright 2023 DXOS.org
//

import { type ColumnDef, type RowData } from '@tanstack/react-table';

import { type ClassNameValue } from '@dxos/react-ui-types';

import { type SearchListQueryModel, type ValueUpdater } from './helpers';

// Define custom meta definitions.
declare module '@tanstack/react-table' {
  // Access via table.options.meta.
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface TableMeta<TData extends RowData> {}

  // eslint-disable-next-line unused-imports/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    expand?: boolean;
    resizable?: boolean;
    model?: SearchListQueryModel<TData>;
    onUpdate?: ValueUpdater<TData, any>;
    digits?: number;
    header?: {
      classNames?: ClassNameValue;
    };
    footer?: {
      classNames?: ClassNameValue;
    };
    cell?: {
      classNames?: ClassNameValue;
    };
  }
}

export type KeyValue<TData extends RowData> = (row: TData) => string;

export type TableColumnDef<TData extends RowData, TValue = any> = ColumnDef<TData, TValue>;
