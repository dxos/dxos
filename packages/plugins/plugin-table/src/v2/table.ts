//
// Copyright 2024 DXOS.org
//

import { computed, type ReadonlySignal } from '@preact/signals-core';
import { produce, setAutoFreeze } from 'immer';

import { create } from '@dxos/echo-schema';

setAutoFreeze(false);

const DEFAULT_WIDTH = 100; // px

export type ColumnId = string;
export type SortDirection = 'asc' | 'desc';

// TODO(Zan): Extend to multi-select.
export type DataType = 'string' | 'number' | 'boolean' | 'date';

export type ColumnDefinition = {
  id: ColumnId;
  dataType: DataType;
  headerLabel: string;

  // TODO(Zan): This return type should be based on the dataType.
  accessor: (row: any) => any;
};

export type SortConfig = { columnId: ColumnId; direction: SortDirection };

export type Table = {
  columnDefinitions: ColumnDefinition[];
  columnOrdering: ColumnId[];
  columnWidths: Record<ColumnId, number>;
  sorting: SortConfig[];
  pinnedRows: { top: number[]; bottom: number[] };
  rowSelection: number[];
  rows: ReadonlySignal<ReadonlySignal<{ [k: string]: any }>[]>;
};

export type TableEvent =
  | { type: 'SetSort'; columnId: ColumnId; direction: SortDirection }
  | { type: 'MoveColumn'; columnId: ColumnId; newIndex: number }
  | { type: 'PinRow'; rowIndex: number; side: 'top' | 'bottom' }
  | { type: 'UnpinRow'; rowIndex: number }
  | { type: 'SelectRow'; rowIndex: number }
  | { type: 'DeselectRow'; rowIndex: number }
  | { type: 'DeselectAllRows' }
  | { type: 'ModifyColumnWidth'; columnId: ColumnId; width: number };

export const updateTable = (table: Table, event: TableEvent): Table =>
  produce(table, (draft) => {
    switch (event.type) {
      case 'SetSort': {
        draft.sorting = [{ columnId: event.columnId, direction: event.direction }];
        break;
      }
      case 'MoveColumn': {
        const currentIndex = draft.columnOrdering.indexOf(event.columnId);
        if (currentIndex !== -1) {
          draft.columnOrdering.splice(currentIndex, 1);
          draft.columnOrdering.splice(event.newIndex, 0, event.columnId);
        }
        break;
      }
      case 'PinRow': {
        draft.pinnedRows[event.side].push(event.rowIndex);
        break;
      }
      case 'UnpinRow': {
        draft.pinnedRows.top = draft.pinnedRows.top.filter((index) => index !== event.rowIndex);
        draft.pinnedRows.bottom = draft.pinnedRows.bottom.filter((index) => index !== event.rowIndex);
        break;
      }
      case 'SelectRow': {
        if (!draft.rowSelection.includes(event.rowIndex)) {
          draft.rowSelection.push(event.rowIndex);
        }
        break;
      }
      case 'DeselectRow': {
        draft.rowSelection = draft.rowSelection.filter((index) => index !== event.rowIndex);
        break;
      }
      case 'DeselectAllRows': {
        draft.rowSelection = [];
        break;
      }
      case 'ModifyColumnWidth': {
        draft.columnWidths[event.columnId] = event.width;
        break;
      }
    }
  });

// Return a preact-signals reactive object (with create) for an initialized table.
// TODO(Zan): Take widths, and callbacks for changing sorting, column widths.
export const createTable = (columnDefinitions: ColumnDefinition[], data: any[]): Table => {
  const rows = computed(() => {
    return data.map((row: any) => {
      return computed(() => {
        return Object.fromEntries(columnDefinitions.map((column) => [column.id, column.accessor(row)]));
      });
    });
  });

  return create({
    columnDefinitions,
    columnOrdering: columnDefinitions.map((column) => column.id),
    columnWidths: Object.fromEntries(columnDefinitions.map((column) => [column.id, DEFAULT_WIDTH])),
    sorting: [],
    pinnedRows: { top: [], bottom: [] },
    rowSelection: [],
    rows,
  });
};
