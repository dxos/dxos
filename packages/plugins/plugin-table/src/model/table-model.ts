//
// Copyright 2024 DXOS.org
//

import { computed, signal, type ReadonlySignal } from '@preact/signals-core';
import sortBy from 'lodash.sortby';

import { Resource } from '@dxos/context';
import { PublicKey } from '@dxos/react-client';
import { parseValue, cellClassesForFieldType } from '@dxos/react-ui-data';
import {
  type DxGridPlaneCells,
  type DxGridCells,
  type DxGridAxisMeta,
  type DxGridCellValue,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { type FieldType, formatValue } from '@dxos/schema';

import { CellUpdateListener } from './update-listener';
import { fromGridCell, type GridCell, type TableType } from '../types';
import { tableButtons } from '../util';

export type ColumnId = string;
export type SortDirection = 'asc' | 'desc';
export type SortConfig = { columnId: ColumnId; direction: SortDirection };

export type TableModelProps = {
  table: TableType;
  sorting?: SortConfig[];
  pinnedRows?: { top: number[]; bottom: number[] };
  rowSelection?: number[];
  onDeleteRow?: (row: any) => void;
  onInsertRow?: (index?: number) => void;
  onCellUpdate?: (cell: GridCell) => void;
};

export class TableModel extends Resource {
  public readonly id = `table-model-${PublicKey.random().truncate()}`;

  public readonly table: TableType;
  public readonly data = signal<any[]>([]);

  public cells!: ReadonlySignal<DxGridCells>;
  public cellUpdateListener!: CellUpdateListener;
  public columnMeta!: ReadonlySignal<DxGridAxisMeta>;

  public pinnedRows: { top: number[]; bottom: number[] };
  public rowSelection: number[];

  public readonly sorting = signal<SortConfig | undefined>(undefined);

  /**
   * Maps display indices to data indices.
   * Used for translating between sorted/displayed order and original data order.
   * Keys are display indices, values are corresponding data indices.
   */
  private readonly displayToDataIndex: Map<number, number> = new Map();

  private readonly onDeleteRow?: (id: string) => void;
  private readonly onInsertRow?: (index?: number) => void;
  public onCellUpdate?: (cell: GridCell) => void;

  constructor({
    table,
    sorting = [],
    pinnedRows = { top: [], bottom: [] },
    rowSelection = [],
    onDeleteRow,
    onInsertRow,
    onCellUpdate,
  }: TableModelProps) {
    super();
    this.table = table;
    this.onDeleteRow = onDeleteRow;
    this.onInsertRow = onInsertRow;
    this.onCellUpdate = onCellUpdate;
    this.sorting.value = sorting.at(0);
    this.pinnedRows = pinnedRows;
    this.rowSelection = rowSelection;
  }

  public updateData = (newData: any[]): void => {
    this.data.value = newData;
  };

  protected override async _open() {
    const headerCells: ReadonlySignal<DxGridPlaneCells> = computed(() => {
      const fields = this.table.view?.fields ?? [];
      return Object.fromEntries(
        fields.map((field, index: number) => [
          fromGridCell({ col: index, row: 0 }),
          {
            value: field.label ?? field.path,
            resizeHandle: 'col',
            accessoryHtml: tableButtons.columnSettings.render({ columnId: field.id }),
            readonly: true,
          },
        ]),
      );
    });

    const sortedRows = computed(() => {
      this.displayToDataIndex.clear();
      const sort = this.sorting.value;
      if (!sort) {
        return this.data.value;
      }

      const field = this.table.view?.fields.find((field) => field.id === sort.columnId);
      if (!field) {
        return this.data.value;
      }

      const dataWithIndices = this.data.value.map((item, index) => ({ item, index }));
      const sorted = sortBy(dataWithIndices, [(wrapper) => wrapper.item[field.path]]);
      if (sort.direction === 'desc') {
        sorted.reverse();
      }

      for (let displayIndex = 0; displayIndex < sorted.length; displayIndex++) {
        const { index: dataIndex } = sorted[displayIndex];
        if (displayIndex !== dataIndex) {
          this.displayToDataIndex.set(displayIndex, dataIndex);
        }
      }

      return sorted.map(({ item }) => item);
    });

    const mainCells: ReadonlySignal<DxGridPlaneCells> = computed(() => {
      const values: DxGridPlaneCells = {};
      const fields = this.table.view?.fields ?? [];

      const addCell = (row: any, field: FieldType, colIndex: number, displayIndex: number): void => {
        // Cell value access is wrapped with a signal so we can listen to granular updates.
        const cellValueSignal = computed(() => {
          return row[field.path] !== undefined ? formatValue(field.type, row[field.path]) : '';
        });

        const cell: DxGridCellValue = {
          get value() {
            return cellValueSignal.value;
          },
        };

        const cellClasses = cellClassesForFieldType(field.type);
        if (cellClasses) {
          cell.className = mx(cellClasses);
        }

        values[fromGridCell({ col: colIndex, row: displayIndex })] = cell;
      };

      sortedRows.value.forEach((row, displayIndex) => {
        fields.forEach((field, colIndex) => {
          addCell(row, field, colIndex, displayIndex);
        });
      });

      return values;
    });

    // Create the frozen end column (action column)
    const actionColumnCells: ReadonlySignal<DxGridPlaneCells> = computed(() => {
      const values: DxGridPlaneCells = {};

      // Add action cells for each row
      for (let displayRow = 0; displayRow < this.data.value.length; displayRow++) {
        values[fromGridCell({ col: 0, row: displayRow })] = {
          value: '',
          accessoryHtml: tableButtons.rowMenu.render({ rowIndex: displayRow }),
          readonly: true,
        };
      }

      return values;
    });

    const newColumnCell: DxGridPlaneCells = {
      [fromGridCell({ col: 0, row: 0 })]: { value: '', accessoryHtml: tableButtons.newColumn.render(), readonly: true },
    };

    this.cells = computed(() => ({
      grid: mainCells.value,
      frozenRowsStart: headerCells.value,
      frozenColsEnd: actionColumnCells.value,
      fixedStartEnd: newColumnCell,
    }));

    this.columnMeta = computed(() => {
      const fields = this.table.view?.fields ?? [];
      const meta = Object.fromEntries(
        fields.map((field, index: number) => [index, { size: field.size ?? 256, resizeable: true }]),
      );

      return {
        grid: meta,
        frozenColsEnd: {
          0: { size: 40, resizeable: false },
        },
      };
    });

    this.cellUpdateListener = new CellUpdateListener(mainCells, this.onCellUpdate);
    this._ctx.onDispose(this.cellUpdateListener.dispose);
  }

  //
  // Setters
  //

  setOnCellUpdate(onCellUpdate: (cell: GridCell) => void): void {
    this.onCellUpdate = onCellUpdate;
    this.cellUpdateListener.setOnCellUpdate(this.onCellUpdate);
  }

  //
  // Data
  //

  public deleteRow = (rowIndex: number): void => {
    const dataIndex = this.displayToDataIndex.get(rowIndex) ?? rowIndex;
    this.onDeleteRow?.(this.data.value[dataIndex]);
  };

  public insertRow = (rowIndex?: number): void => {
    const dataIndex =
      rowIndex !== undefined ? this.displayToDataIndex.get(rowIndex) ?? rowIndex : this.data.value.length;
    this.onInsertRow?.(dataIndex);
  };

  public getCellData = ({ col, row }: GridCell): any => {
    const fields = this.table.view?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return undefined;
    }

    const field = fields[col];
    const dataIndex = this.displayToDataIndex.get(row) ?? row;
    return this.data.value[dataIndex][field.path];
  };

  public setCellData = ({ col, row }: GridCell, value: any): void => {
    const fields = this.table.view?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return;
    }

    const field = fields[col];
    const dataIndex = this.displayToDataIndex.get(row) ?? row;
    this.data.value[dataIndex][field.path] = parseValue(field.type, value);
  };

  public getRowCount = (): number => this.data.value.length;

  //
  // Move
  //

  public moveColumn(columnId: ColumnId, newIndex: number): void {
    const fields = this.table.view?.fields ?? [];
    const currentIndex = fields.findIndex((field) => field.id === columnId);
    if (currentIndex !== -1 && this.table.view) {
      const [removed] = fields.splice(currentIndex, 1);
      // Ensure we don't move past the action column
      const adjustedNewIndex = Math.min(newIndex, fields.length);
      fields.splice(adjustedNewIndex, 0, removed);
    }
  }

  //
  // Resize
  //

  public setColumnWidth(columnIndex: number, width: number): void {
    const fields = this.table.view?.fields ?? [];
    if (columnIndex < fields.length) {
      const newWidth = Math.max(0, width);
      const field = fields[columnIndex];
      if (field) {
        field.size = newWidth;
      }
    }
  }

  //
  // Sorting
  //

  public setSort(columnId: ColumnId, direction: SortDirection): void {
    this.sorting.value = { columnId, direction };
  }

  public clearSort(): void {
    this.sorting.value = undefined;
  }

  //
  // Pinning
  //

  // TODO(burdon): Change to setPinned(on/off).
  public pinRow(rowIndex: number, side: 'top' | 'bottom'): void {
    this.pinnedRows[side].push(rowIndex);
  }

  public unpinRow(rowIndex: number): void {
    this.pinnedRows.top = this.pinnedRows.top.filter((index: number) => index !== rowIndex);
    this.pinnedRows.bottom = this.pinnedRows.bottom.filter((index: number) => index !== rowIndex);
  }

  //
  // Selection
  //

  // TODO(burdon): Change to setSelection(on/off).
  public selectRow(rowIndex: number) {
    if (!this.rowSelection.includes(rowIndex)) {
      this.rowSelection.push(rowIndex);
    }
  }

  public deselectRow(rowIndex: number) {
    this.rowSelection = this.rowSelection.filter((index: number) => index !== rowIndex);
  }

  public deselectAllRows() {
    this.rowSelection = [];
  }
}
