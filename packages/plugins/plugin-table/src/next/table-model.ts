//
// Copyright 2024 DXOS.org
//

import { computed, type ReadonlySignal } from '@preact/signals-core';

import { Resource } from '@dxos/context';
import { PublicKey } from '@dxos/react-client';
import { type DxGridPlaneCells, type DxGridCells } from '@dxos/react-ui-grid';

import { CellUpdateListener } from './CellUpdateListener';

const DEFAULT_WIDTH = 256; // px

export type ColumnId = string;

// TODO(Zan): Extend to multi-select.
export type DataType = 'string' | 'number' | 'boolean' | 'date';

export type ColumnDefinition = {
  id: ColumnId;
  dataType: DataType;
  headerLabel: string;

  // TODO(Zan): This return type should be based on the dataType.
  accessor: (row: any) => any;
};

export type SortDirection = 'asc' | 'desc';
export type SortConfig = { columnId: ColumnId; direction: SortDirection };

export class TableModel extends Resource {
  public readonly id = `table-model-${PublicKey.random().truncate()}`;

  public cells!: ReadonlySignal<DxGridCells>;
  public cellUpdateListener!: CellUpdateListener;

  constructor(
    public readonly columnDefinitions: ColumnDefinition[],
    public readonly data: any[],
    private onCellUpdate?: (col: number, row: number) => void,
    public columnOrdering: ColumnId[] = columnDefinitions.map((column) => column.id),
    public columnWidths: Record<ColumnId, number> = Object.fromEntries(
      columnDefinitions.map((column) => [column.id, DEFAULT_WIDTH]),
    ),
    public sorting: SortConfig[] = [],
    public pinnedRows: { top: number[]; bottom: number[] } = { top: [], bottom: [] },
    public rowSelection: number[] = [],
  ) {
    super();
  }

  protected override async _open() {
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

    this.cellUpdateListener = new CellUpdateListener(cellValues, this.onCellUpdate);
    this._ctx.onDispose(this.cellUpdateListener.dispose);
  }

  public setSort(columnId: ColumnId, direction: SortDirection): void {
    this.sorting = [{ columnId, direction }];
  }

  public moveColumn(columnId: ColumnId, newIndex: number): void {
    const currentIndex = this.columnOrdering.indexOf(columnId);
    if (currentIndex !== -1) {
      this.columnOrdering.splice(currentIndex, 1);
      this.columnOrdering.splice(newIndex, 0, columnId);
    }
  }

  public pinRow(rowIndex: number, side: 'top' | 'bottom'): void {
    this.pinnedRows[side].push(rowIndex);
  }

  public unpinRow(rowIndex: number): void {
    this.pinnedRows.top = this.pinnedRows.top.filter((index: number) => index !== rowIndex);
    this.pinnedRows.bottom = this.pinnedRows.bottom.filter((index: number) => index !== rowIndex);
  }

  public selectRow(rowIndex: number): void {
    if (!this.rowSelection.includes(rowIndex)) {
      this.rowSelection.push(rowIndex);
    }
  }

  public deselectRow(rowIndex: number): void {
    this.rowSelection = this.rowSelection.filter((index: number) => index !== rowIndex);
  }

  public deselectAllRows(): void {
    this.rowSelection = [];
  }

  public modifyColumnWidth(columnIndex: number, width: number): void {
    const columnId = this.columnOrdering.at(columnIndex);
    if (columnId) {
      const newWidth = Math.max(0, width);
      this.columnWidths[columnId] = newWidth;
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
}
