//
// Copyright 2023 DXOS.org
//

import { type RowData, type RowSelectionState, type Table, type VisibilityState } from '@tanstack/react-table';

import { type KeyValue, type TableColumnDef } from '../../types';

export type TableFlags = Partial<{
  role: 'table' | 'grid' | 'treegrid';
  grouping: string[];
  header: boolean;
  footer: boolean;
  border: boolean;
  fullWidth: boolean;
  debug: boolean;
  expand: boolean;
  rowsSelectable: boolean | 'multi';
}>;

export type TableProps<TData extends RowData> = TableFlags &
  Partial<{
    keyAccessor: KeyValue<TData>;
    data: TData[];
    columns: TableColumnDef<TData>[];
    onColumnResize: (state: Record<string, number>) => void;
    columnVisibility: VisibilityState;
    // Controllable row selection
    rowSelection: RowSelectionState;
    defaultRowSelection: RowSelectionState;
    onRowSelectionChange: (rowSelection: RowSelectionState) => void;
  }>;

export type TableContextValue<TData extends RowData> = TableFlags &
  Pick<TableProps<TData>, 'keyAccessor'> & {
    table: Table<TData>;
    isGrid: boolean;
  };
