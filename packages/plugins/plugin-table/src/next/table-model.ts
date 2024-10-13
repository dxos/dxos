//
// Copyright 2024 DXOS.org
//

import { computed, type ReadonlySignal } from '@preact/signals-core';

import { Resource } from '@dxos/context';
import { PublicKey } from '@dxos/react-client';
import { type DxGridPlaneCells, type DxGridCells, type DxGridAxisMeta } from '@dxos/react-ui-grid';

import { CellUpdateListener } from './CellUpdateListener';
import { getCellKey } from './util/coords';
import { type TableType } from '../types';

export type ColumnId = string;
export type SortDirection = 'asc' | 'desc';
export type SortConfig = { columnId: ColumnId; direction: SortDirection };

export type TableModelProps = {
  table: TableType;
  data: any[];
  onCellUpdate?: (col: number, row: number) => void;
  sorting?: SortConfig[];
  pinnedRows?: { top: number[]; bottom: number[] };
  rowSelection?: number[];
};

export class TableModel extends Resource {
  public readonly id = `table-model-${PublicKey.random().truncate()}`;

  public cells!: ReadonlySignal<DxGridCells>;
  public cellUpdateListener!: CellUpdateListener;
  public columnMeta!: ReadonlySignal<DxGridAxisMeta>;

  public readonly table: TableType;
  public readonly data: any[];
  private onCellUpdate?: (col: number, row: number) => void;
  public sorting: SortConfig[];
  public pinnedRows: { top: number[]; bottom: number[] };
  public rowSelection: number[];

  constructor({
    table,
    data,
    onCellUpdate,
    sorting = [],
    pinnedRows = { top: [], bottom: [] },
    rowSelection = [],
  }: TableModelProps) {
    super();
    this.table = table;
    this.data = data;
    this.onCellUpdate = onCellUpdate;
    this.sorting = sorting;
    this.pinnedRows = pinnedRows;
    this.rowSelection = rowSelection;
  }

  protected override async _open() {
    // Construct the header cells based on the table props.
    const headerCells: DxGridPlaneCells = Object.fromEntries(
      this.table.props.map((prop, index) => {
        return [getCellKey(index, 0), { value: prop.id!, resizeHandle: 'col' }];
      }),
    );

    // Map the data to grid cells.
    const cellValues: ReadonlySignal<DxGridPlaneCells> = computed(() => {
      const values: DxGridPlaneCells = {};
      this.data.forEach((row, rowIndex) => {
        this.table.props.forEach((prop, colIndex) => {
          const cellValueSignal = computed(() => `${row[prop.id!]}`);
          values[getCellKey(colIndex, rowIndex)] = {
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

    this.columnMeta = computed(() => {
      const headings = Object.fromEntries(
        this.table.props.map((prop, index) => [index, { size: prop.size ?? 256, resizeable: true }]),
      );
      return { grid: headings };
    });

    this.cellUpdateListener = new CellUpdateListener(cellValues, this.onCellUpdate);
    this._ctx.onDispose(this.cellUpdateListener.dispose);
  }

  public setSort(columnId: ColumnId, direction: SortDirection): void {
    this.sorting = [{ columnId, direction }];
  }

  public moveColumn(columnId: ColumnId, newIndex: number): void {
    const currentIndex = this.table.props.findIndex((prop) => prop.id === columnId);
    if (currentIndex !== -1) {
      const [removed] = this.table.props.splice(currentIndex, 1);
      this.table.props.splice(newIndex, 0, removed);
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

  public setColumnWidth(columnIndex: number, width: number): void {
    const newWidth = Math.max(0, width);
    const prop = this.table.props.at(columnIndex);
    if (prop) {
      prop.size = newWidth;
    }
  }

  public getCellData = (colIndex: number, rowIndex: number): any => {
    if (rowIndex < 0 || rowIndex >= this.data.length || colIndex < 0 || colIndex >= this.table.props.length) {
      return undefined;
    }
    const propId = this.table.props[colIndex].id!;
    return this.data[rowIndex][propId];
  };

  public setCellData = (colIndex: number, rowIndex: number, value: any): void => {
    if (rowIndex < 0 || rowIndex >= this.data.length || colIndex < 0 || colIndex >= this.table.props.length) {
      return;
    }
    const propId = this.table.props[colIndex].id!;
    this.data[rowIndex][propId] = value;
  };
}
