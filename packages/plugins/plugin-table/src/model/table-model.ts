//
// Copyright 2024 DXOS.org
//

import { computed, effect, signal, type ReadonlySignal } from '@preact/signals-core';
import sortBy from 'lodash.sortby';

import { Resource } from '@dxos/context';
import { PublicKey } from '@dxos/react-client';
import { parseValue, cellClassesForFieldType } from '@dxos/react-ui-data';
import {
  type DxGridPlaneCells,
  type DxGridAxisMeta,
  type DxGridPlaneRange,
  type DxGridPlane,
  type DxGridCellValue,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { formatValue } from '@dxos/schema';

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
  onRowOrderChanged?: () => void;
};

export class TableModel extends Resource {
  public readonly id = `table-model-${PublicKey.random().truncate()}`;

  public readonly table: TableType;
  private rows = signal<any[]>([]);
  private sortedRows!: ReadonlySignal<any[]>;

  private visibleRange = signal<DxGridPlaneRange>({
    start: { row: 0, col: 0 },
    end: { row: 0, col: 0 },
  });

  private rowEffects: Array<() => void> = [];

  public columnMeta!: ReadonlySignal<DxGridAxisMeta>;

  public readonly sorting = signal<SortConfig | undefined>(undefined);
  public pinnedRows: { top: number[]; bottom: number[] };
  public rowSelection: number[];

  /**
   * Maps display indices to data indices.
   * Used for translating between sorted/displayed order and original data order.
   * Keys are display indices, values are corresponding data indices.
   */
  private readonly displayToDataIndex: Map<number, number> = new Map();

  private readonly onDeleteRow?: (id: string) => void;
  private readonly onInsertRow?: (index?: number) => void;
  public onCellUpdate?: (cell: GridCell) => void;
  public onRowOrderChanged?: () => void;

  constructor({
    table,
    sorting = [],
    pinnedRows = { top: [], bottom: [] },
    rowSelection = [],
    onDeleteRow,
    onInsertRow,
    onCellUpdate,
    onRowOrderChanged,
  }: TableModelProps) {
    super();
    this.table = table;
    this.onDeleteRow = onDeleteRow;
    this.onInsertRow = onInsertRow;
    this.sorting.value = sorting.at(0);
    this.pinnedRows = pinnedRows;
    this.rowSelection = rowSelection;
    this.onCellUpdate = onCellUpdate;
    this.onRowOrderChanged = onRowOrderChanged;
  }

  public updateData = (newData: any[]): void => {
    this.rows.value = newData;
  };

  protected override async _open() {
    this.sortedRows = computed(() => {
      this.displayToDataIndex.clear();
      const sort = this.sorting.value;
      if (!sort) {
        return this.rows.value;
      }

      const field = this.table.view?.fields.find((field) => field.id === sort.columnId);
      if (!field) {
        return this.rows.value;
      }

      const dataWithIndices = this.rows.value.map((item, index) => ({ item, index }));
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

    const rowOrderWatcher = effect(() => {
      const _sortedRows = this.sortedRows.value;
      this.onRowOrderChanged?.();
    });

    this._ctx.onDispose(rowOrderWatcher);

    // Watch rows for changes
    const rowEffectManager = effect(() => {
      // Create new effects that watch for changes to each row in the visible range
      // and update the table when they change through onCellUpdate
      const { start, end } = this.visibleRange.value;

      for (let row = start.row; row <= end.row; row++) {
        this.rowEffects.push(
          effect(() => {
            const rowData = this.sortedRows.value[row];
            this?.table?.view?.fields.forEach((field) => rowData?.[field.path]);
            this.onCellUpdate?.({ row, col: start.col });
          }),
        );
      }

      return () => {
        this.rowEffects.forEach((cleanup) => cleanup());
        this.rowEffects = [];
      };
    });

    this._ctx.onDispose(rowEffectManager);

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
  }

  //
  // Setters
  //

  setOnCellUpdate(onCellUpdate: (cell: GridCell) => void): void {
    this.onCellUpdate = onCellUpdate;
  }

  setOnRowOrderChange(onRowOrderChange: () => void): void {
    this.onRowOrderChanged = onRowOrderChange;
  }

  //
  // Get Cells
  //
  public getCells = (range: DxGridPlaneRange, plane: DxGridPlane): DxGridPlaneCells => {
    switch (plane) {
      case 'grid': {
        this.visibleRange.value = range;
        return this.getMainGridCells(range);
      }
      case 'frozenRowsStart': {
        return this.getHeaderCells(range);
      }
      case 'frozenColsEnd': {
        return this.getActionColumnCells(range);
      }
      case 'fixedStartEnd': {
        return this.getNewColumnCell();
      }
      default: {
        return {};
      }
    }
  };

  private getMainGridCells = (range: DxGridPlaneRange): DxGridPlaneCells => {
    const values: DxGridPlaneCells = {};
    const fields = this.table.view?.fields ?? [];

    const addCell = (row: any, field: any, colIndex: number, displayIndex: number): void => {
      const cell: DxGridCellValue = {
        get value() {
          return row?.[field.path] !== undefined ? formatValue(field.type, row[field.path]) : '';
        },
      };
      const classes = cellClassesForFieldType(field.type);
      if (classes) {
        cell.className = mx(classes);
      }
      values[fromGridCell({ col: colIndex, row: displayIndex })] = cell;
    };

    for (let row = range.start.row; row <= range.end.row && row < this.sortedRows.value.length; row++) {
      for (let col = range.start.col; col <= range.end.col && col < fields.length; col++) {
        const field = fields[col];
        if (!field) {
          continue;
        }
        addCell(this.sortedRows.value[row], field, col, row);
      }
    }

    return values;
  };

  private getHeaderCells = (range: DxGridPlaneRange): DxGridPlaneCells => {
    const values: DxGridPlaneCells = {};
    const fields = this.table.view?.fields ?? [];

    for (let col = range.start.col; col <= range.end.col && col < fields.length; col++) {
      const field = fields[col];
      if (!field) {
        continue;
      }
      values[fromGridCell({ col, row: 0 })] = {
        value: field.label ?? field.path,
        resizeHandle: 'col',
        accessoryHtml: tableButtons.columnSettings.render({ columnId: field.id }),
        readonly: true,
      };
    }
    return values;
  };

  private getActionColumnCells = (range: DxGridPlaneRange): DxGridPlaneCells => {
    const values: DxGridPlaneCells = {};

    for (let row = range.start.row; row <= range.end.row && row < this.rows.value.length; row++) {
      values[fromGridCell({ col: 0, row })] = {
        value: '',
        accessoryHtml: tableButtons.rowMenu.render({ rowIndex: row }),
        readonly: true,
      };
    }
    return values;
  };

  private getNewColumnCell = (): DxGridPlaneCells => {
    return {
      [fromGridCell({ col: 0, row: 0 })]: {
        value: '',
        accessoryHtml: tableButtons.newColumn.render(),
        readonly: true,
      },
    };
  };

  //
  // Data
  //

  public deleteRow = (rowIndex: number): void => {
    const dataIndex = this.displayToDataIndex.get(rowIndex) ?? rowIndex;
    this.onDeleteRow?.(this.rows.value[dataIndex]);
  };

  public insertRow = (rowIndex?: number): void => {
    const dataIndex =
      rowIndex !== undefined ? this.displayToDataIndex.get(rowIndex) ?? rowIndex : this.rows.value.length;
    this.onInsertRow?.(dataIndex);
  };

  public getCellData = ({ col, row }: GridCell): any => {
    const fields = this.table.view?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return undefined;
    }

    const field = fields[col];
    const dataIndex = this.displayToDataIndex.get(row) ?? row;
    return this.rows.value[dataIndex][field.path];
  };

  public setCellData = ({ col, row }: GridCell, value: any): void => {
    const fields = this.table.view?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return;
    }

    const field = fields[col];
    const dataIndex = this.displayToDataIndex.get(row) ?? row;
    this.rows.value[dataIndex][field.path] = parseValue(field.type, value);
  };

  public getRowCount = (): number => this.rows.value.length;

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
