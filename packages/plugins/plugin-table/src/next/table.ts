//
// Copyright 2024 DXOS.org
//

import { computed } from '@preact/signals-core';

import { create } from '@dxos/echo-schema';

import { CellUpdateTracker } from './CellUpdateTracker';

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
export type Table = ReturnType<typeof createTable>;

export type TableEvent =
  | { type: 'SetSort'; columnId: ColumnId; direction: SortDirection }
  | { type: 'MoveColumn'; columnId: ColumnId; newIndex: number }
  | { type: 'PinRow'; rowIndex: number; side: 'top' | 'bottom' }
  | { type: 'UnpinRow'; rowIndex: number }
  | { type: 'SelectRow'; rowIndex: number }
  | { type: 'DeselectRow'; rowIndex: number }
  | { type: 'DeselectAllRows' }
  | { type: 'ModifyColumnWidth'; columnIndex: number; width: number };

export const updateTable = (table: Table, event: TableEvent): Table => {
  switch (event.type) {
    case 'SetSort': {
      table.sorting = [{ columnId: event.columnId, direction: event.direction }];
      break;
    }
    case 'MoveColumn': {
      const currentIndex = table.columnOrdering.indexOf(event.columnId);
      if (currentIndex !== -1) {
        table.columnOrdering.splice(currentIndex, 1);
        table.columnOrdering.splice(event.newIndex, 0, event.columnId);
      }
      break;
    }
    case 'PinRow': {
      table.pinnedRows[event.side].push(event.rowIndex);
      break;
    }
    case 'UnpinRow': {
      table.pinnedRows.top = table.pinnedRows.top.filter((index: number) => index !== event.rowIndex);
      table.pinnedRows.bottom = table.pinnedRows.bottom.filter((index: number) => index !== event.rowIndex);
      break;
    }
    case 'SelectRow': {
      if (!table.rowSelection.includes(event.rowIndex)) {
        table.rowSelection.push(event.rowIndex);
      }
      break;
    }
    case 'DeselectRow': {
      table.rowSelection = table.rowSelection.filter((index: number) => index !== event.rowIndex);
      break;
    }
    case 'DeselectAllRows': {
      table.rowSelection = [];
      break;
    }
    case 'ModifyColumnWidth': {
      const columnId = table.columnOrdering.at(event.columnIndex);
      if (columnId) {
        const newWidth = Math.max(0, event.width);
        table.columnWidths[columnId] = newWidth;
      }
      break;
    }
  }
  return table;
};

// Return a preact-signals reactive object (with create) for an initialized table.
// TODO(Zan): Take widths + callbacks for width changes, column ordering.
export const createTable = (columnDefinitions: ColumnDefinition[], data: any[]) => {
  /**
   * Creates a computed signal structure for table cells.
   *
   * This structure is optimized for reactive collaboration on cell edits:
   *
   * 1. Outer computed:
   *    - Tracks changes to the entire data array (additions, removals, reordering)
   *    - Recreates all cell computed signals when triggered
   *
   * 2. Inner computed (one per cell):
   *    - Tracks changes to individual cell data
   *    - Recalculates only when its specific cell data changes
   *
   * Benefits:
   * - Highly efficient for cell-level edits (most common in collaborative editing)
   * - Maintains reactivity at the cell level
   * - Automatically updates UI for all users on any collaborative change
   * - Eliminates the need for a separate row structure
   *
   * Performance characteristics:
   * - Cell edits: Optimal (only affected cell recalculates)
   * - Array-level changes: More expensive (all cell `computed` recreated)
   */

  const cells = computed(() => {
    const cellMap = new Map();

    data.forEach((row, rowIndex) => {
      columnDefinitions.forEach((col, colIndex) => {
        const key = `${colIndex},${rowIndex}`;
        cellMap.set(
          key,
          computed(() => {
            const value = col.accessor(row);
            return value;
          }),
        );
      });
    });

    return cellMap;
  });

  const rowCount = computed(() => data.length);
  const updateTracker = new CellUpdateTracker(cells);

  return create({
    columnDefinitions,
    columnOrdering: columnDefinitions.map((column) => column.id),
    columnWidths: Object.fromEntries(columnDefinitions.map((column) => [column.id, DEFAULT_WIDTH])),
    sorting: [] as SortConfig[],
    pinnedRows: { top: [], bottom: [] } as { top: number[]; bottom: number[] },
    rowSelection: [] as number[],
    rowCount,
    cells,
    __cellUpdateTracker: updateTracker as CellUpdateTracker,
    dispose: () => {
      updateTracker.dispose();
    },
  });
};
