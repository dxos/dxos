//
// Copyright 2025 DXOS.org
//

import { computed, effect, signal, type ReadonlySignal } from '@preact/signals-core';

import { type Space } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { type FieldSortType, FormatEnum, getValue, setValue, type JsonProp } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { isReactiveObject, makeRef } from '@dxos/live-object';
import { formatForEditing, parseValue } from '@dxos/react-ui-form';
import {
  type DxGridAxisMeta,
  type DxGridPlaneRange,
  type DxGridPlanePosition,
  type DxGridPosition,
} from '@dxos/react-ui-grid';
import { type ViewType, type ViewProjection } from '@dxos/schema';

import { SelectionModel } from './selection-model';
import { TableSorting } from './table-sorting';
import { touch } from '../util';

export type BaseTableRow = Record<JsonProp, any> & { id: string };

export type TableRowAction = {
  id: string;
  translationKey: string;
};

// TODO(ZaymonFC): There should be a separate concept for immutable schemata.
export type TableFeatures = {
  selection: boolean;
  editable: boolean;
};

const defaultFeatures: TableFeatures = {
  selection: true,
  editable: false,
};

export type TableModelProps<T extends BaseTableRow = { id: string }> = {
  id?: string;
  space?: Space;
  view?: ViewType;
  projection: ViewProjection;
  features?: Partial<TableFeatures>;
  sorting?: FieldSortType[];
  pinnedRows?: { top: number[]; bottom: number[] };
  onInsertRow?: (index?: number) => void;
  onDeleteRows?: (index: number, obj: T[]) => void;
  onDeleteColumn?: (fieldId: string) => void;
  onCellUpdate?: (cell: DxGridPosition) => void;
  onRowOrderChanged?: () => void;
  rowActions?: TableRowAction[];
  onRowAction?: (actionId: string, data: T) => void;
};

export class TableModel<T extends BaseTableRow = { id: string }> extends Resource {
  private readonly _id: string | undefined;
  private readonly _space: Space | undefined;
  private readonly _view: ViewType | undefined;
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
  private readonly _rowActions: TableRowAction[];
  private readonly _onRowAction?: TableModelProps<T>['onRowAction'];
  private readonly _features: TableFeatures;

  private readonly _rows = signal<T[]>([]);
  private readonly _sorting: TableSorting<T>;

  private _pinnedRows: NonNullable<TableModelProps<T>['pinnedRows']>;
  private _selection!: SelectionModel<T>;
  private _columnMeta?: ReadonlySignal<DxGridAxisMeta>;

  constructor({
    id,
    space,
    view,
    projection,
    features = {},
    sorting = [],
    pinnedRows = { top: [], bottom: [] },
    onCellUpdate,
    onDeleteColumn,
    onDeleteRows,
    onInsertRow,
    onRowOrderChanged,
    rowActions = [],
    onRowAction,
  }: TableModelProps<T>) {
    super();
    this._id = id;
    this._space = space;
    this._view = view;
    this._projection = projection;
    this._features = { ...defaultFeatures, ...features };

    this._sorting = new TableSorting(this._rows, this._view, projection);

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
    this._rowActions = rowActions;
    this._onRowAction = onRowAction;
  }

  public get id() {
    return this._id;
  }

  public get space() {
    return this._space;
  }

  public get view() {
    return this._view;
  }

  public get projection() {
    return this._projection;
  }

  public get rows(): ReadonlySignal<T[]> {
    return this._sorting.sortedRows;
  }

  public get features(): TableFeatures {
    return this._features;
  }

  /**
   * @reactive
   */
  public get sorting(): TableSorting<T> | undefined {
    return this._sorting;
  }

  /**
   * Gets the row data at the specified display index.
   */
  public getRowAt(displayIndex: number): T | undefined {
    if (displayIndex < 0 || displayIndex >= this._sorting.sortedRows.value.length) {
      return undefined;
    }

    return this._sorting.sortedRows.value[displayIndex];
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

  /** @reactive */
  public get isViewDirty(): boolean {
    return this._sorting.isDirty;
  }

  public get rowActions(): TableRowAction[] {
    return this._rowActions;
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
      const fields = this._view?.fields ?? [];
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
            this._view?.fields.forEach((field) => touch(getValue(obj, field.path)));
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

  public getColumnCount = (): number => this._view?.fields.length ?? 0;

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

  public handleRowAction = (actionId: string, rowIndex: number): void => {
    if (!this._onRowAction) {
      return;
    }

    const row = this._sorting.getDataIndex(rowIndex);
    const data = this._rows.value[row];

    if (data) {
      this._onRowAction(actionId, data);
    }
  };

  public getCellData = ({ col, row }: DxGridPlanePosition): any => {
    const fields = this._view?.fields ?? [];
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
    const fields = this._view?.fields ?? [];
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
    const fields = this._view?.fields ?? [];
    const field = fields[col];

    const value = getValue(this._rows.value[dataRow], field.path);
    const updatedValue = update(value);
    setValue(this._rows.value[dataRow], field.path, updatedValue);
  }

  //
  // Column Operations
  //

  public deleteColumn(fieldId: string): void {
    if (!this._view) {
      return;
    }

    const field = this._view?.fields.find((field) => field.id === fieldId);
    if (field && this._onDeleteColumn) {
      this._onDeleteColumn(field.id);
    }
  }

  //
  // Resize
  //

  public setColumnWidth(columnIndex: number, width: number): void {
    const fields = this._view?.fields ?? [];
    if (columnIndex < fields.length) {
      const newWidth = Math.max(0, width);
      const field = fields[columnIndex];
      if (field) {
        field.size = newWidth;
      }
    }
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
  // View operations
  //
  public saveView(): void {
    this._sorting.save();
  }
}
