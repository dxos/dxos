//
// Copyright 2024 DXOS.org
//

import { computed, type ReadonlySignal } from '@preact/signals-core';

import { type DxGridPlaneCells, type DxGridCells } from '@dxos/react-ui-grid';

import { CellUpdateListener } from './CellUpdateListener';

const DEFAULT_WIDTH = 256; // px

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

export type TableAction =
  | { type: 'SetSort'; columnId: ColumnId; direction: SortDirection }
  | { type: 'MoveColumn'; columnId: ColumnId; newIndex: number }
  | { type: 'PinRow'; rowIndex: number; side: 'top' | 'bottom' }
  | { type: 'UnpinRow'; rowIndex: number }
  | { type: 'SelectRow'; rowIndex: number }
  | { type: 'DeselectRow'; rowIndex: number }
  | { type: 'DeselectAllRows' }
  | { type: 'ModifyColumnWidth'; columnIndex: number; width: number };

export class TableModel {
  public columnDefinitions: ColumnDefinition[];
  private data: any[];

  // Ephermeral view concerns.
  public columnOrdering: ColumnId[];
  public columnWidths: Record<ColumnId, number>;
  public sorting: SortConfig[];
  public pinnedRows: { top: number[]; bottom: number[] };
  public rowSelection: number[];

  public cells: ReadonlySignal<DxGridCells>;
  public cellUpdateListener: CellUpdateListener;

  // TODO(Zan): Take `TableType` directly.
  constructor(columnDefinitions: ColumnDefinition[], data: any[]) {
    this.columnDefinitions = columnDefinitions;
    this.data = data;
    this.columnOrdering = columnDefinitions.map((column) => column.id);
    this.columnWidths = Object.fromEntries(columnDefinitions.map((column) => [column.id, DEFAULT_WIDTH]));
    this.sorting = [];
    this.pinnedRows = { top: [], bottom: [] };
    this.rowSelection = [];

    // Construct the header cells based on the column definitions.
    const headerCells: DxGridPlaneCells = Object.fromEntries(
      this.columnDefinitions.map((col, index) => {
        return [`${index},0`, { value: col.headerLabel, resizeHandle: 'col' }];
      }),
    );

    // Map the data to grid cells.
    const cellValues: ReadonlySignal<DxGridPlaneCells> = computed(() => {
      const values: DxGridPlaneCells = {};
      this.data.forEach((row, rowIndex) => {
        this.columnDefinitions.forEach((col, colIndex) => {
          const cellValueSignal = computed(() => `${col.accessor(row)}`);
          values[`${colIndex},${rowIndex}`] = {
            get value() {
              return cellValueSignal.value;
            },
          };
        });
      });
      return values;
    });

    this.cells = computed(() => {
      return { grid: cellValues.value, frozenRowsStart: headerCells };
    });

    this.cellUpdateListener = new CellUpdateListener(cellValues);
  }

  public dispatch(action: TableAction): void {
    switch (action.type) {
      case 'SetSort': {
        this.sorting = [{ columnId: action.columnId, direction: action.direction }];
        break;
      }
      case 'MoveColumn': {
        const currentIndex = this.columnOrdering.indexOf(action.columnId);
        if (currentIndex !== -1) {
          this.columnOrdering.splice(currentIndex, 1);
          this.columnOrdering.splice(action.newIndex, 0, action.columnId);
        }
        break;
      }
      case 'PinRow': {
        this.pinnedRows[action.side].push(action.rowIndex);
        break;
      }
      case 'UnpinRow': {
        this.pinnedRows.top = this.pinnedRows.top.filter((index: number) => index !== action.rowIndex);
        this.pinnedRows.bottom = this.pinnedRows.bottom.filter((index: number) => index !== action.rowIndex);
        break;
      }
      case 'SelectRow': {
        if (!this.rowSelection.includes(action.rowIndex)) {
          this.rowSelection.push(action.rowIndex);
        }
        break;
      }
      case 'DeselectRow': {
        this.rowSelection = this.rowSelection.filter((index: number) => index !== action.rowIndex);
        break;
      }
      case 'DeselectAllRows': {
        this.rowSelection = [];
        break;
      }
      case 'ModifyColumnWidth': {
        const columnId = this.columnOrdering.at(action.columnIndex);
        if (columnId) {
          const newWidth = Math.max(0, action.width);
          this.columnWidths[columnId] = newWidth;
        }
        break;
      }
    }
  }

  public getCellData = (colIndex: number, rowIndex: number): any => {
    if (rowIndex < 0 || rowIndex >= this.data.length || colIndex < 0 || colIndex >= this.columnDefinitions.length) {
      return undefined;
    }
    const column = this.columnDefinitions[colIndex];
    return column.accessor(this.data[rowIndex]);
  };

  public setCellData = (colIndex: number, rowIndex: number, value: any): void => {
    if (rowIndex < 0 || rowIndex >= this.data.length || colIndex < 0 || colIndex >= this.columnDefinitions.length) {
      return;
    }
    const column = this.columnDefinitions[colIndex];
    const row = this.data[rowIndex];

    for (const key in row) {
      if (column.accessor(row) === row[key]) {
        row[key] = value;
        break;
      }
    }
  };

  public dispose(): void {
    this.cellUpdateListener.dispose();
  }
}
