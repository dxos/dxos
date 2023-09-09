//
// Copyright 2023 DXOS.org
//

import { ColumnDef, RowData } from '@tanstack/react-table';

// Define custom meta definitions.
declare module '@tanstack/react-table' {
  // Access via table.options.meta.
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface TableMeta<TData extends RowData> {}

  // eslint-disable-next-line unused-imports/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    expand?: boolean;
    resizable?: boolean;
    slots?: {
      header?: {
        className?: string;
      };
      footer?: {
        className?: string;
      };
      cell?: {
        className?: string;
      };
    };
  }
}

export type KeyValue<TData extends RowData> = (row: TData) => string;

export type GridColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<TData, TValue>;
