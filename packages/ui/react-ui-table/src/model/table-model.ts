//
// Copyright 2024 DXOS.org
//

import { computed, effect, signal, type ReadonlySignal } from '@preact/signals-core';

import { Resource } from '@dxos/context';
import { getValue, setValue, FormatEnum, type JsonProp } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { isReactiveObject, makeRef } from '@dxos/live-object';
import { PublicKey } from '@dxos/react-client';
import { formatForEditing, parseValue } from '@dxos/react-ui-form';
import {
  type DxGridAxisMeta,
  type DxGridPlaneRange,
  type DxGridPlanePosition,
  type DxGridPosition,
} from '@dxos/react-ui-grid';
import { type ViewProjection } from '@dxos/schema';

import { SelectionModel } from './selection-model';
import { type SortConfig, type SortDirection, TableSorting } from './table-sorting';
import { type TableType } from '../types';
import { touch } from '../util';

export type BaseTableRow = Record<JsonProp, any> & { id: string };

export type TableModelProps<T extends BaseTableRow = { id: string }> = {
  table: TableType;
  projection: ViewProjection;
  sorting?: SortConfig[];
  pinnedRows?: { top: number[]; bottom: number[] };
  onInsertRow?: (index?: number) => void;
  onDeleteRows?: (index: number, obj: T[]) => void;
  onDeleteColumn?: (fieldId: string) => void;
  onCellUpdate?: (cell: DxGridPosition) => void;
  onRowOrderChanged?: () => void;
};

export class TableModel<T extends BaseTableRow = { id: string }> extends Resource {
  public readonly id = `table-model-${PublicKey.random().truncate()}`;

  private readonly _table: TableType;
  private readonly _projection: ViewProjection;

  private readonly _visibleRange = signal<DxGridPlaneRange>({
    start: { row: 0, col: 0 },
    end: { row: 0, col: 0 },
  });

  private readonly _onInsertRow?: TableModelProps<T>['onInsertRow'];
  private readonly _onDeleteRows?: TableModelProps<T>['onDeleteRows'];
  private readonly _onDeleteColumn?: TableModelProps<T>['onDeleteColumn'];
  private readonly _onCellUpdate?: TableModelProps<T>['onCellUpdate'];
  private readonly _onRowOrderChanged?: TableModelProps<T>['onRowOrderChanged'];

  private readonly _rows = signal<T[]>([]);
  private readonly _sorting: TableSorting<T>;

  private _pinnedRows: NonNullable<TableModelProps<T>['pinnedRows']>;
  private _selection!: SelectionModel<T>;
  private _columnMeta?: ReadonlySignal<DxGridAxisMeta>;

  constructor({
    table,
    projection,
    sorting = [],
    pinnedRows = { top: [], bottom: [] },
    onCellUpdate,
    onDeleteColumn,
    onDeleteRows,
    onInsertRow,
    onRowOrderChanged,
  }: TableModelProps<T>) {
    super();
    this._table = table;
    this._projection = projection;
    this._sorting = new TableSorting(this._rows, table, projection);

    if (sorting.length > 0) {
      const [sort] = sorting;
      this._sorting.setSort(sort.fieldId, sort.direction);
    }

    this._pinnedRows = pinnedRows;
    this._onInsertRow = onInsertRow;
    this._onDeleteRows = onDeleteRows;
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

  public get rows(): ReadonlySignal<T[]> {
    return this._sorting.sortedRows;
  }

  public get pinnedRows(): NonNullable<TableModelProps<T>['pinnedRows']> {
    return this._pinnedRows;
  }

  public get columnMeta(): ReadonlySignal<DxGridAxisMeta> {
    invariant(this._columnMeta);
    return this._columnMeta;
  }

  public get selection() {
    return this._selection;
  }

  //
  // Initialisation
  //

  protected override async _open() {
    this.initializeColumnMeta();
    this.initializeEffects();
    this._selection = new SelectionModel(this._sorting.sortedRows, () => this._onRowOrderChanged?.());
    await this._selection.open(this._ctx);
  }

  private initializeColumnMeta(): void {
    this._columnMeta = computed(() => {
      const fields = this._table.view?.target?.fields ?? [];
      const meta = Object.fromEntries(
        fields.map((field, index: number) => [index, { size: field?.size ?? 256, resizeable: true }]),
      );

      return {
        grid: meta,
        frozenColsStart: { 0: { size: 30, resizeable: false } },
        frozenColsEnd: { 0: { size: 40, resizeable: false } },
      };
    });
  }

  private initializeEffects(): void {
    const rowOrderWatcher = effect(() => {
      touch(this._sorting.sortedRows.value);
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
            const obj = this._sorting.sortedRows.value[row];
            this?._table?.view?.target?.fields.forEach((field) => touch(getValue(obj, field.path)));
            this._onCellUpdate?.({ row, col: start.col, plane: 'grid' });
          }),
        );
      }

      return () => rowEffects.forEach((cleanup) => cleanup());
    });
    this._ctx.onDispose(rowEffectManager);
  }

  //
  // Data
  //

  public setRows = (obj: T[]): void => {
    this._rows.value = obj;
  };

  public getRowCount = (): number => this._rows.value.length;

  public getColumnCount = (): number => this.table.view?.target?.fields.length ?? 0;

  public insertRow = (rowIndex?: number): void => {
    const row = rowIndex !== undefined ? this._sorting.getDataIndex(rowIndex) : this._rows.value.length;
    this._onInsertRow?.(row);
  };

  public deleteRow = (rowIndex: number): void => {
    const row = this._sorting.getDataIndex(rowIndex);
    const obj = this._rows.value[row];
    const objectsToDelete = [];

    if (this._selection.hasSelection.value) {
      const selectedRows = this._selection.getSelectedRows();
      objectsToDelete.push(...selectedRows);
    } else {
      objectsToDelete.push(obj);
    }

    this._onDeleteRows?.(row, objectsToDelete);
  };

  public getCellData = ({ col, row }: DxGridPlanePosition): any => {
    const fields = this.table.view?.target?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return undefined;
    }

    const field = fields[col];
    const dataIndex = this._sorting.getDataIndex(row);
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

        return getValue(value.target, field.referencePath);
      }

      default: {
        return formatForEditing({ type: props.type, format: props.format, value });
      }
    }
  };

  public setCellData = ({ col, row }: DxGridPlanePosition, value: any): void => {
    const rowIdx = this._sorting.getDataIndex(row);
    const fields = this.table.view?.target?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return;
    }

    const field = fields[col];
    const { props } = this._projection.getFieldProjection(field.id);
    switch (props.format) {
      case FormatEnum.Ref: {
        // TODO(ZaymonFC): This get's called an additional time by the cell editor onBlur, but with the cell editors
        //   plain string value. Maybe onBlur should be called with the actual value?
        if (isReactiveObject(value)) {
          setValue(this._rows.value[rowIdx], field.path, makeRef(value));
        }
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

  /**
   * Updates a cell's value using a transform function.
   * @param {DxGridPlanePosition} position - The position of the cell to update.
   * @param {(value: any) => any} update - A function that takes the current value and returns the updated value.
   */
  public updateCellData({ col, row }: DxGridPlanePosition, update: (value: any) => any): void {
    const dataRow = this._sorting.getDataIndex(row);
    const fields = this.table.view?.target?.fields ?? [];
    const field = fields[col];

    const value = getValue(this._rows.value[dataRow], field.path);
    const updatedValue = update(value);
    setValue(this._rows.value[dataRow], field.path, updatedValue);
  }

  //
  // Column Operations
  //

  public deleteColumn(fieldId: string): void {
    if (!this.table.view) {
      return;
    }

    const field = this.table.view.target?.fields.find((field) => field.id === fieldId);
    if (field && this._onDeleteColumn) {
      this._onDeleteColumn(field.id);
    }
  }

  //
  // Resize
  //

  public setColumnWidth(columnIndex: number, width: number): void {
    const fields = this.table.view?.target?.fields ?? [];
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
    this._sorting.setSort(fieldId, direction);
  }

  public clearSort(): void {
    this._sorting.setSort('', 'asc');
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
}
