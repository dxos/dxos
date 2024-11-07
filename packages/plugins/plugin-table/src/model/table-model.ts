//
// Copyright 2024 DXOS.org
//

import { computed, effect, signal, type ReadonlySignal } from '@preact/signals-core';
import sortBy from 'lodash.sortby';

import { Resource } from '@dxos/context';
import { PublicKey } from '@dxos/react-client';
import { cellClassesForFieldType, parseValue } from '@dxos/react-ui-data';
import {
  type DxGridPlaneCells,
  type DxGridAxisMeta,
  type DxGridPlaneRange,
  type DxGridPlane,
  type DxGridCellValue,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { type ViewProjection, type FieldType, formatValue } from '@dxos/schema';

import { fromGridCell, type GridCell, type TableType } from '../types';
import { tableButtons, touch } from '../util';

export type ColumnId = string;
export type SortDirection = 'asc' | 'desc';
export type SortConfig = { columnId: ColumnId; direction: SortDirection };

export type TableModelProps = {
  table: TableType;
  projection: ViewProjection;
  sorting?: SortConfig[];
  pinnedRows?: { top: number[]; bottom: number[] };
  rowSelection?: number[];
  onAddColumn?: (field: FieldType) => void;
  onDeleteColumn?: (field: FieldType) => void;
  onDeleteRow?: (row: any) => void;
  onInsertRow?: (index?: number) => void;
  onCellUpdate?: (cell: GridCell) => void;
  onRowOrderChanged?: () => void;
};

export class TableModel extends Resource {
  public readonly id = `table-model-${PublicKey.random().truncate()}`;

  public readonly _table: TableType;
  public readonly _projection: ViewProjection;

  private rows = signal<any[]>([]);
  private sortedRows!: ReadonlySignal<any[]>;

  private visibleRange = signal<DxGridPlaneRange>({
    start: { row: 0, col: 0 },
    end: { row: 0, col: 0 },
  });

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
  private readonly onAddColumn?: (field: FieldType) => void;
  private readonly onDeleteColumn?: (field: FieldType) => void;
  private readonly onDeleteRow?: (id: string) => void;
  private readonly onInsertRow?: (index?: number) => void;
  public onCellUpdate?: (cell: GridCell) => void;
  public onRowOrderChanged?: () => void;

  constructor({
    table,
    projection,
    sorting = [],
    pinnedRows = { top: [], bottom: [] },
    rowSelection = [],
    onAddColumn,
    onDeleteColumn,
    onDeleteRow,
    onInsertRow,
    onCellUpdate,
    onRowOrderChanged,
  }: TableModelProps) {
    super();
    this._table = table;
    this._projection = projection;

    this.sorting.value = sorting.at(0);
    this.pinnedRows = pinnedRows;
    this.rowSelection = rowSelection;

    this.onAddColumn = onAddColumn;
    this.onDeleteColumn = onDeleteColumn;
    this.onDeleteRow = onDeleteRow;
    this.onInsertRow = onInsertRow;
    this.onCellUpdate = onCellUpdate;
    this.onRowOrderChanged = onRowOrderChanged;
  }

  get table() {
    return this._table;
  }

  get projection() {
    return this._projection;
  }

  public updateData = (newData: any[]): void => {
    this.rows.value = newData;
  };

  protected override async _open() {
    this.initializeColumnMeta();
    this.initializeSorting();
    this.initializeEffects();
  }

  private initializeColumnMeta(): void {
    this.columnMeta = computed(() => {
      const fields = this._table.view?.fields ?? [];
      const meta = Object.fromEntries(
        fields.map((field, index: number) => [index, { size: field?.size ?? 256, resizeable: true }]),
      );

      return {
        grid: meta,
        frozenColsEnd: {
          0: { size: 40, resizeable: false },
        },
      };
    });
  }

  private initializeSorting(): void {
    this.sortedRows = computed(() => {
      this.displayToDataIndex.clear();
      const sort = this.sorting.value;
      if (!sort) {
        return this.rows.value;
      }

      const field = this._table.view?.fields.find((field) => field.property === sort.columnId);
      if (!field) {
        return this.rows.value;
      }

      const dataWithIndices = this.rows.value.map((item, index) => ({ item, index }));
      const sorted = sortBy(dataWithIndices, [(wrapper) => wrapper.item[field.property]]);
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
  }

  private initializeEffects(): void {
    const rowOrderWatcher = effect(() => {
      touch(this.sortedRows.value);
      this.onRowOrderChanged?.();
    });
    this._ctx.onDispose(rowOrderWatcher);

    /**
     * Creates reactive effects for each row in the visible range.
     * Subscribes to changes in the visible range, recreating row effects when it changes.
     * When a row's data changes, invokes onCellUpdate to notify subscribers and trigger UI updates.
     */
    const rowEffectManager = effect(() => {
      const { start, end } = touch(this.visibleRange.value);

      const rowEffects: ReturnType<typeof effect>[] = [];
      for (let row = start.row; row <= end.row; row++) {
        rowEffects.push(
          effect(() => {
            const rowData = this.sortedRows.value[row];
            this?._table?.view?.fields.forEach((field) => touch(rowData?.[field.property]));
            this.onCellUpdate?.({ row, col: start.col });
          }),
        );
      }

      return () => rowEffects.forEach((cleanup) => cleanup());
    });
    this._ctx.onDispose(rowEffectManager);
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
    const fields = this._table.view?.fields ?? [];

    // TODO(burdon): Types.
    const addCell = (row: any, field: FieldType, colIndex: number, displayIndex: number): void => {
      const { props } = this._projection.getFieldProjection(field.property);
      const cell: DxGridCellValue = {
        get value() {
          // TODO(burdon): Infer type.
          return row?.[field.property] !== undefined ? formatValue(props.format, row[field.property]) : '';
        },
      };

      const classes = cellClassesForFieldType(props.format);
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
        // TODO(ZaymonFC): Restore the label here.
        value: field.property,
        resizeHandle: 'col',
        accessoryHtml: tableButtons.columnSettings.render({ columnId: field.property }),
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
    const value = this.rows.value[dataIndex][field.property];

    const {
      proms: { format },
    } = this._projection.getFieldProjection(field.property);
    if (format) {
      return formatValue(format, value);
    }

    return value;
  };

  public setCellData = ({ col, row }: GridCell, value: any): void => {
    const dataIndex = this.displayToDataIndex.get(row) ?? row;
    const fields = this.table.view?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return;
    }

    const field = fields[col];
    const {
      props: { format },
    } = this._projection.getFieldProjection(field.property);
    if (format) {
      this.rows.value[dataIndex][field.property] = parseValue(format, value);
    } else {
      this.rows.value[dataIndex][field.property] = value;
    }
  };

  public getRowCount = (): number => this.rows.value.length;

  //
  // Column Operations
  //

  public addColumn(field: FieldType): void {
    if (this.onAddColumn) {
      this.onAddColumn(field);
    }
  }

  public deleteColumn(columnId: string): void {
    if (!this.table.view) {
      return;
    }

    const field = this.table.view.fields.find((field) => field.property === columnId);
    if (field && this.onDeleteColumn) {
      if (this.sorting.value?.columnId === columnId) {
        this.clearSort();
      }
      this.onDeleteColumn(field);
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
