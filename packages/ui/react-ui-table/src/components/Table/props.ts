//
// Copyright 2023 DXOS.org
//

import { type RowData, type RowSelectionState, type Table, type VisibilityState } from '@tanstack/react-table';

import { type ClassNameValue } from '@dxos/react-ui-types';

import { type ColumnSorting } from '../../hooks';
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
  stickyHeader: boolean;
  rowsSelectable: boolean | 'multi';
}>;

/**
 * This is ‘current’ in the `aria-current` sense.
 */
export type TableCurrent<TData extends RowData> = Partial<{
  // App state
  currentDatum: TData;
  onDatumClick: (datum: TData) => void;
}>;

export type TableProps<TData extends RowData> = TableFlags &
  TableCurrent<TData> &
  Partial<{
    keyAccessor: KeyValue<TData>;
    data: TData[];
    columns: TableColumnDef<TData>[];
    onColumnResize: (state: Record<string, number>) => void;
    onColumnReorder: (columnId: string, direction: 'left' | 'right') => void;
    columnVisibility: VisibilityState;
    // Controllable row selection
    rowSelection: RowSelectionState;
    defaultRowSelection: RowSelectionState;
    onRowSelectionChange: (rowSelection: RowSelectionState) => void;
    // Derived from row selection
    onDataSelectionChange: (dataSelection: TData[]) => void;
    // `table` element props
    classNames: ClassNameValue;
    pinLastRow: boolean;
  }>;

export type { RowSelectionState, VisibilityState, TableColumnDef, KeyValue };

export type TableContextValue<TData> = TableFlags &
  TableCurrent<TData> &
  Pick<TableProps<TData>, 'keyAccessor'> & {
    table: Table<TData>;
    isGrid: boolean;
  } & ColumnSorting;
