//
// Copyright 2024 DXOS.org
//

import { computed, effect, signal, type ReadonlySignal } from '@preact/signals-core';
import orderBy from 'lodash.orderby';

import { Resource } from '@dxos/context';
import { getValue, setValue, FormatEnum, type JsonProp } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
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
import { type TableType } from '../types';
import { touch } from '../util';

export type SortDirection = 'asc' | 'desc';
export type SortConfig = { fieldId: string; direction: SortDirection };

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

  /**
   * Maps display indices to data indices.
   * Used for translating between sorted/displayed order and original data order.
   * Keys are display indices, values are corresponding data indices.
   */
  private readonly _displayToDataIndex: Map<number, number> = new Map();

  private readonly _onInsertRow?: TableModelProps<T>['onInsertRow'];
  private readonly _onDeleteRows?: TableModelProps<T>['onDeleteRows'];
  private readonly _onDeleteColumn?: TableModelProps<T>['onDeleteColumn'];
  private readonly _onCellUpdate?: TableModelProps<T>['onCellUpdate'];
  private readonly _onRowOrderChanged?: TableModelProps<T>['onRowOrderChanged'];

  private readonly _sorting = signal<SortConfig | undefined>(undefined);
  private _sortedRows!: ReadonlySignal<T[]>;
  private _rows = signal<T[]>([]);

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

    this._sorting.value = sorting.at(0);
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
    return this._sortedRows;
  }

  public get pinnedRows(): NonNullable<TableModelProps<T>['pinnedRows']> {
    return this._pinnedRows;
  }

  public get columnMeta(): ReadonlySignal<DxGridAxisMeta> {
    invariant(this._columnMeta);
    return this._columnMeta;
  }

  public get sorting(): SortConfig | undefined {
    return this._sorting.value;
  }

  public get selection() {
    return this._selection;
  }

  //
  // Initialisation
  //

  protected override async _open() {
    this.initializeColumnMeta();
    this.initializeSorting();
    this.initializeEffects();
    this._selection = new SelectionModel(this._sortedRows, () => this._onRowOrderChanged?.());
    await this._selection.open(this._ctx);
  }

  private initializeColumnMeta(): void {
    this._columnMeta = computed(() => {
      const fields = this._table.view?.fields ?? [];
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

  public getColumnCount = (): number => this.table.view?.fields.length ?? 0;

  public insertRow = (rowIndex?: number): void => {
    const row = rowIndex !== undefined ? this._displayToDataIndex.get(rowIndex) ?? rowIndex : this._rows.value.length;
    this._onInsertRow?.(row);
  };

  public deleteRow = (rowIndex: number): void => {
    const row = this._displayToDataIndex.get(rowIndex) ?? rowIndex;
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

  public setCellData = ({ col, row }: DxGridPlanePosition, value: any): void => {
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
}
