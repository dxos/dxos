//
// Copyright 2024 DXOS.org
//

import { computed, effect, signal, type ReadonlySignal } from '@preact/signals-core';
import orderBy from 'lodash.orderby';

import { Resource } from '@dxos/context';
import { FormatEnum, type JsonProp } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/react-client';
import { cellClassesForFieldType, formatForDisplay, formatForEditing, parseValue } from '@dxos/react-ui-data';
import {
  type DxGridAxisMeta,
  type DxGridCellValue,
  type DxGridPlane,
  type DxGridPlaneCells,
  type DxGridPlaneRange,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { type ViewProjection, type FieldType, getValue, setValue, VIEW_FIELD_LIMIT } from '@dxos/schema';

import { ModalController } from './modal-controller';
import { fromGridCell, type GridCell, type TableType } from '../types';
import { tableButtons, touch } from '../util';

export type SortDirection = 'asc' | 'desc';
export type SortConfig = { fieldId: string; direction: SortDirection };

export type BaseTableRow = Record<JsonProp, any>;

export type TableModelProps<T extends BaseTableRow = {}> = {
  table: TableType;
  projection: ViewProjection;
  sorting?: SortConfig[];
  pinnedRows?: { top: number[]; bottom: number[] };
  rowSelection?: number[];
  onInsertRow?: (index?: number) => void;
  onDeleteRow?: (index: number, obj: T) => void;
  onDeleteColumn?: (fieldId: string) => void;
  onCellUpdate?: (cell: GridCell) => void;
  onRowOrderChanged?: () => void;
};

export class TableModel<T extends BaseTableRow = {}> extends Resource {
  public readonly id = `table-model-${PublicKey.random().truncate()}`;

  private readonly _table: TableType;
  private readonly _projection: ViewProjection;

  private readonly _visibleRange = signal<DxGridPlaneRange>({
    start: { row: 0, col: 0 },
    end: { row: 0, col: 0 },
  });

  /**
   * Maps display indices to data indices.
   * Used for translating between sorted/displayed order and original data order.
   * Keys are display indices, values are corresponding data indices.
   */
  private readonly _displayToDataIndex: Map<number, number> = new Map();

  private readonly _onInsertRow?: TableModelProps<T>['onInsertRow'];
  private readonly _onDeleteRow?: TableModelProps<T>['onDeleteRow'];
  private readonly _onDeleteColumn?: TableModelProps<T>['onDeleteColumn'];
  private readonly _onCellUpdate?: TableModelProps<T>['onCellUpdate'];
  private readonly _onRowOrderChanged?: TableModelProps<T>['onRowOrderChanged'];

  private readonly _sorting = signal<SortConfig | undefined>(undefined);
  private _sortedRows!: ReadonlySignal<T[]>;
  private _rows = signal<T[]>([]);

  private _pinnedRows: NonNullable<TableModelProps<T>['pinnedRows']>;
  private _rowSelection: NonNullable<TableModelProps<T>['rowSelection']>;
  private _columnMeta?: ReadonlySignal<DxGridAxisMeta>;

  private readonly _modalController = new ModalController();

  constructor({
    table,
    projection,
    sorting = [],
    pinnedRows = { top: [], bottom: [] },
    rowSelection = [],
    onCellUpdate,
    onDeleteColumn,
    onDeleteRow,
    onInsertRow,
    onRowOrderChanged,
  }: TableModelProps<T>) {
    super();
    this._table = table;
    this._projection = projection;

    this._sorting.value = sorting.at(0);
    this._pinnedRows = pinnedRows;
    this._rowSelection = rowSelection;

    this._onInsertRow = onInsertRow;
    this._onDeleteRow = onDeleteRow;
    this._onDeleteColumn = onDeleteColumn;
    this._onCellUpdate = onCellUpdate;
    this._onRowOrderChanged = onRowOrderChanged;
  }

  public get table() {
    return this._table;
  }

  public get projection() {
    return this._projection;
  }

  public get pinnedRows(): NonNullable<TableModelProps<T>['pinnedRows']> {
    return this._pinnedRows;
  }

  public get rowSelection(): NonNullable<TableModelProps<T>['rowSelection']> {
    return this._rowSelection;
  }

  public get columnMeta(): ReadonlySignal<DxGridAxisMeta> {
    invariant(this._columnMeta);
    return this._columnMeta;
  }

  public get sorting(): SortConfig | undefined {
    return this._sorting.value;
  }

  public get modalController() {
    return this._modalController;
  }

  //
  // Initialisation
  //

  protected override async _open() {
    this.initializeColumnMeta();
    this.initializeSorting();
    this.initializeEffects();
  }

  private initializeColumnMeta(): void {
    this._columnMeta = computed(() => {
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
    this._sortedRows = computed(() => {
      this._displayToDataIndex.clear();
      const sort = this._sorting.value;
      if (!sort) {
        return this._rows.value;
      }

      const field = this._table.view?.fields.find((field) => field.id === sort.fieldId);
      if (!field) {
        return this._rows.value;
      }

      const dataWithIndices = this._rows.value.map((item, index) => {
        const value = getValue(item, field.path);
        return { item, index, value, isEmpty: value == null || value === '' };
      });
      const sorted = orderBy(dataWithIndices, ['isEmpty', 'value'], ['asc', sort.direction]);

      for (let displayIndex = 0; displayIndex < sorted.length; displayIndex++) {
        const { index: dataIndex } = sorted[displayIndex];
        if (displayIndex !== dataIndex) {
          this._displayToDataIndex.set(displayIndex, dataIndex);
        }
      }

      return sorted.map(({ item }) => item);
    });
  }

  private initializeEffects(): void {
    const rowOrderWatcher = effect(() => {
      touch(this._sortedRows.value);
      this._onRowOrderChanged?.();
    });
    this._ctx.onDispose(rowOrderWatcher);

    /**
     * Creates reactive effects for each row in the visible range.
     * Subscribes to changes in the visible range, recreating row effects when it changes.
     * When a row's data changes, invokes onCellUpdate to notify subscribers and trigger UI updates.
     */
    const rowEffectManager = effect(() => {
      const { start, end } = touch(this._visibleRange.value);
      const rowEffects: ReturnType<typeof effect>[] = [];
      for (let row = start.row; row <= end.row; row++) {
        rowEffects.push(
          effect(() => {
            const obj = this._sortedRows.value[row];
            this?._table?.view?.fields.forEach((field) => touch(getValue(obj, field.path)));
            this._onCellUpdate?.({ row, col: start.col });
          }),
        );
      }

      return () => rowEffects.forEach((cleanup) => cleanup());
    });
    this._ctx.onDispose(rowEffectManager);
  }

  //
  // Get Cells
  //

  public getCells = (range: DxGridPlaneRange, plane: DxGridPlane): DxGridPlaneCells => {
    switch (plane) {
      case 'grid': {
        this._visibleRange.value = range;
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

    const addCell = (obj: T, field: FieldType, colIndex: number, displayIndex: number): void => {
      const { props } = this._projection.getFieldProjection(field.id);
      const value: DxGridCellValue = {
        get value() {
          const value = getValue(obj, field.path);
          if (value == null) {
            return '';
          }

          switch (props.format) {
            case FormatEnum.Ref: {
              if (!field.referencePath) {
                return ''; // TODO(burdon): Show error.
              }

              return getValue(value, field.referencePath);
            }

            default: {
              return formatForDisplay({ type: props.type, format: props.format, value });
            }
          }
        },
      };

      const classes = cellClassesForFieldType({ type: props.type, format: props.format });
      if (classes) {
        value.className = mx(classes);
      }

      const idx = fromGridCell({ col: colIndex, row: displayIndex });
      values[idx] = value;
    };

    for (let row = range.start.row; row <= range.end.row && row < this._sortedRows.value.length; row++) {
      for (let col = range.start.col; col <= range.end.col && col < fields.length; col++) {
        const field = fields[col];
        if (!field) {
          continue;
        }

        addCell(this._sortedRows.value[row], field, col, row);
      }
    }

    return values;
  };

  private getHeaderCells = (range: DxGridPlaneRange): DxGridPlaneCells => {
    const values: DxGridPlaneCells = {};
    const fields = this.table.view?.fields ?? [];
    for (let col = range.start.col; col <= range.end.col && col < fields.length; col++) {
      const { field, props } = this._projection.getFieldProjection(fields[col].id);
      values[fromGridCell({ col, row: 0 })] = {
        value: props.title ?? field.path,
        resizeHandle: 'col',
        accessoryHtml: tableButtons.columnSettings.render({ fieldId: field.id }),
        readonly: true,
      };
    }

    return values;
  };

  private getActionColumnCells = (range: DxGridPlaneRange): DxGridPlaneCells => {
    const values: DxGridPlaneCells = {};
    for (let row = range.start.row; row <= range.end.row && row < this._rows.value.length; row++) {
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
        accessoryHtml: tableButtons.addColumn.render({
          disabled: (this._table.view?.fields?.length ?? 0) >= VIEW_FIELD_LIMIT,
        }),
        readonly: true,
      },
    };
  };

  //
  // Data
  //

  public setRows = (obj: T[]): void => {
    this._rows.value = obj;
  };

  public getRowCount = (): number => this._rows.value.length;

  public getColumnCount = (): number => this.table.view?.fields.length ?? 0;

  public insertRow = (rowIndex?: number): void => {
    const row = rowIndex !== undefined ? this._displayToDataIndex.get(rowIndex) ?? rowIndex : this._rows.value.length;
    this._onInsertRow?.(row);
  };

  public deleteRow = (rowIndex: number): void => {
    const row = this._displayToDataIndex.get(rowIndex) ?? rowIndex;
    const obj = this._rows.value[row];
    this._onDeleteRow?.(row, obj);
  };

  public getCellData = ({ col, row }: GridCell): any => {
    const fields = this.table.view?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return undefined;
    }

    const field = fields[col];
    const dataIndex = this._displayToDataIndex.get(row) ?? row;
    const value = getValue(this._rows.value[dataIndex], field.path);
    if (value == null) {
      return '';
    }

    const { props } = this._projection.getFieldProjection(field.id);
    switch (props.format) {
      case FormatEnum.Ref: {
        if (!field.referencePath) {
          return ''; // TODO(burdon): Show error.
        }

        return getValue(value, field.referencePath);
      }

      default: {
        return formatForEditing({ type: props.type, format: props.format, value });
      }
    }
  };

  public setCellData = ({ col, row }: GridCell, value: any): void => {
    const rowIdx = this._displayToDataIndex.get(row) ?? row;
    const fields = this.table.view?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return;
    }

    const field = fields[col];
    const { props } = this._projection.getFieldProjection(field.id);
    switch (props.format) {
      case FormatEnum.Ref: {
        setValue(this._rows.value[rowIdx], field.path, value);
        break;
      }

      default: {
        setValue(
          this._rows.value[rowIdx],
          field.path,
          parseValue({
            type: props.type,
            format: props.format,
            value,
          }),
        );
        break;
      }
    }
  };

  //
  // Column Operations
  //

  public deleteColumn(fieldId: string): void {
    if (!this.table.view) {
      return;
    }

    const field = this.table.view.fields.find((field) => field.id === fieldId);
    if (field && this._onDeleteColumn) {
      if (this._sorting.value?.fieldId === fieldId) {
        this.clearSort();
      }
      this._onDeleteColumn(field.id);
    }
  }

  //
  // Interactions
  //
  public handleGridClick = (event: React.MouseEvent): void => {
    this._modalController.handleClick(event);
    // TODO(ZaymonFC): Future cell-interaction click handling will go here. (checkboxes, toggles etc.)
    //   _modalController.handleClick returns whether the click was handled by the modal controller.
  };

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

  public setSort(fieldId: string, direction: SortDirection): void {
    this._sorting.value = { fieldId, direction };
  }

  public clearSort(): void {
    this._sorting.value = undefined;
  }

  //
  // Pinning
  //

  // TODO(burdon): Change to setPinned(on/off).
  public pinRow(rowIndex: number, side: 'top' | 'bottom'): void {
    this._pinnedRows[side].push(rowIndex);
  }

  public unpinRow(rowIndex: number): void {
    this._pinnedRows.top = this._pinnedRows.top.filter((index: number) => index !== rowIndex);
    this._pinnedRows.bottom = this._pinnedRows.bottom.filter((index: number) => index !== rowIndex);
  }

  //
  // Selection
  //

  // TODO(burdon): Change to setSelection(on/off).
  public selectRow(rowIndex: number) {
    if (!this._rowSelection.includes(rowIndex)) {
      this._rowSelection.push(rowIndex);
    }
  }

  public deselectRow(rowIndex: number) {
    this._rowSelection = this._rowSelection.filter((index: number) => index !== rowIndex);
  }

  public deselectAllRows() {
    this._rowSelection = [];
  }
}
