//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, computed, effect, signal } from '@preact/signals-core';

import { Resource } from '@dxos/context';
import { type Database, Format, Obj, Order, Query, type QueryAST, Ref } from '@dxos/echo';
import { type JsonProp, type JsonSchemaType, toEffectSchema } from '@dxos/echo/internal';
import { getValue, setValue } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { getSnapshot, isLiveObject } from '@dxos/live-object';
import { type Label } from '@dxos/react-ui';
import { formatForEditing, parseValue } from '@dxos/react-ui-form';
import {
  type DxGridAxisMeta,
  type DxGridPlanePosition,
  type DxGridPlaneRange,
  type DxGridPosition,
} from '@dxos/react-ui-grid';
import {
  type FieldSortType,
  type ProjectionModel,
  type PropertyType,
  type SortDirectionType,
  type ValidationError,
  type View,
  validateSchema,
} from '@dxos/schema';

import { type Table } from '../types';
import { touch } from '../util';
import { extractTagIds } from '../util/tag';

import { type SelectionMode, SelectionModel } from './selection-model';

// Domain types for cell classification
export type TableCellType = 'standard' | 'draft' | 'header';

// TODO(ZaymonFC): Use a common type?
export type ValidationResult = { valid: true } | { valid: false; error: string };

export type DraftRow<T extends TableRow = TableRow> = {
  data: T;
  valid: boolean;
  validationErrors: ValidationError[];
};

// TODO(burdon): Use schema types.
export type TableRow = Record<JsonProp, any> & { id: string };

export type TableRowAction = {
  id: string;
  label: Label;
};

export type TableFeatures = {
  selection: { enabled: boolean; mode?: SelectionMode };
  dataEditable: boolean;
  schemaEditable: boolean;
};

const defaultFeatures: TableFeatures = {
  selection: { enabled: true, mode: 'multiple' },
  dataEditable: false,
  schemaEditable: false,
};

export type InsertRowResult = 'draft' | 'final';

export type TableModelProps<T extends TableRow = TableRow> = {
  object: Table.Table;
  projection: ProjectionModel;
  db?: Database.Database;
  features?: Partial<TableFeatures>;
  initialSelection?: string[];
  pinnedRows?: { top: number[]; bottom: number[] };
  rowActions?: TableRowAction[];
  onResolveSchema?: (typename: string) => Promise<JsonSchemaType>;
  onInsertRow?: (data?: any) => InsertRowResult;
  onDeleteRows?: (index: number, obj: T[]) => void;
  onDeleteColumn?: (fieldId: string) => void;
  onCellUpdate?: (cell: DxGridPosition) => void;
  onRowOrderChange?: () => void;
  onRowAction?: (actionId: string, data: T) => void;
};

export class TableModel<T extends TableRow = TableRow> extends Resource {
  private readonly _object: Table.Table;
  private readonly _projection: ProjectionModel;
  private readonly _db?: Database.Database;

  private readonly _visibleRange = signal<DxGridPlaneRange>({
    start: { row: 0, col: 0 },
    end: { row: 0, col: 0 },
  });

  private readonly _onInsertRow?: (data?: any) => InsertRowResult;
  private readonly _onDeleteRows?: TableModelProps<T>['onDeleteRows'];
  private readonly _onDeleteColumn?: TableModelProps<T>['onDeleteColumn'];
  private readonly _onCellUpdate?: TableModelProps<T>['onCellUpdate'];
  private readonly _onRowOrderChange?: TableModelProps<T>['onRowOrderChange'];
  private readonly _onRowAction?: TableModelProps<T>['onRowAction'];
  private readonly _rowActions: TableRowAction[];
  private readonly _features: TableFeatures;

  private readonly _rows = signal<T[]>([]);
  private readonly _draftRows = signal<DraftRow<T>[]>([]);
  // In-memory sort state - changes are local until saved
  private readonly _inMemorySort = signal<FieldSortType | undefined>(undefined);
  // Computed signal for sorted rows (used by rows getter and SelectionModel)
  private readonly _sortedRows: ReadonlySignal<T[]>;
  // Computed signal for viewDirty state
  private readonly _viewDirty: ReadonlySignal<boolean>;

  private _pinnedRows: NonNullable<TableModelProps<T>['pinnedRows']>;
  private _selection!: SelectionModel<T>;
  private _columnMeta?: ReadonlySignal<DxGridAxisMeta>;

  constructor({
    object,
    projection,
    db,
    features = {},
    initialSelection = [],
    pinnedRows = { top: [], bottom: [] },
    rowActions = [],
    onCellUpdate,
    onDeleteColumn,
    onDeleteRows,
    onInsertRow,
    onRowOrderChange,
    onRowAction,
  }: TableModelProps<T>) {
    super();
    this._object = object;
    this._projection = projection;
    this._projection.normalizeView();
    this._db = db;

    // TODO(ZaymonFC): Use our more robust config merging module?
    this._features = { ...defaultFeatures, ...features };

    invariant(
      !(this._features.dataEditable && this._features.selection.enabled && this._features.selection.mode === 'single'),
      'Single selection is not compatible with editable tables.',
    );

    // Create computed signal for sorted rows (used by rows getter and SelectionModel)
    this._sortedRows = computed(() => {
      const rows = this._rows.value;
      const sort = this.sorting;

      if (!sort || rows.length === 0) {
        return rows;
      }

      const field = this._projection.fields.find((f) => f.id === sort.fieldId);
      if (!field) {
        return rows;
      }

      // Get field projection to check format
      const fieldProjection = this._projection.getFieldProjection(field.id);

      const sorted = [...rows].sort((a, b) => {
        const aValue = getValue(a, field.path);
        const bValue = getValue(b, field.path);
        return compareValues(aValue, bValue, fieldProjection.props.format, sort.direction);
      });

      return sorted;
    });

    this._selection = new SelectionModel(
      this._sortedRows,
      this._features.selection.mode ?? 'multiple',
      initialSelection,
      () => this._onRowOrderChange?.(),
    );

    // Create computed signal for viewDirty
    this._viewDirty = computed(() => {
      const inMemorySort = this._inMemorySort.value;
      if (!inMemorySort) {
        return false;
      }

      const extractOrder = (queryAst: QueryAST.Query): readonly QueryAST.Order[] | undefined => {
        if (queryAst.type === 'order') {
          return queryAst.order;
        }
        if (queryAst.type === 'options') {
          return extractOrder(queryAst.query);
        }
        return undefined;
      };

      // Compare with persisted sort from view.query.ast
      const orders = extractOrder(this.view.query.ast);
      if (orders && orders.length > 0) {
        const firstOrder = orders[0];
        if (firstOrder.kind === 'property') {
          const field = this._projection.fields.find((f) => f.path === firstOrder.property);
          if (field && field.id === inMemorySort.fieldId && firstOrder.direction === inMemorySort.direction) {
            // In-memory sort matches persisted sort
            return false;
          }
        }
      }

      // In-memory sort differs from persisted sort (or no persisted sort)
      return true;
    });

    this._pinnedRows = pinnedRows;
    this._rowActions = rowActions;
    this._onInsertRow = onInsertRow;
    this._onDeleteRows = onDeleteRows;
    this._onDeleteColumn = onDeleteColumn;
    this._onCellUpdate = onCellUpdate;
    this._onRowOrderChange = onRowOrderChange;
    this._onRowAction = onRowAction;
  }

  public get id(): string {
    return Obj.getDXN(this._object).toString();
  }

  public get view(): View.View {
    const view = this._object.view.target;
    invariant(view, 'Table model not initialized');
    return view;
  }

  public get table(): Table.Table {
    return this._object;
  }

  public get projection(): ProjectionModel {
    return this._projection;
  }

  public get db(): Database.Database | undefined {
    return this._db;
  }

  /**
   * Gets rows with in-memory sorting applied.
   * In-memory sort is local to this instance until saved.
   */
  public get rows(): ReadonlySignal<T[]> {
    return this._sortedRows;
  }

  public get features(): TableFeatures {
    return this._features;
  }

  /**
   * Gets the current sort state.
   * Returns in-memory sort if set, otherwise falls back to persisted sort from query AST.
   * @reactive
   */
  public get sorting(): FieldSortType | undefined {
    // Return in-memory sort if set (local changes)
    const inMemorySort = this._inMemorySort.value;
    if (inMemorySort) {
      return inMemorySort;
    }

    // Otherwise, read from persisted view.query.ast
    const view = this.view;
    // Snapshot view before accessing query.ast
    const viewSnapshot = Obj.getSnapshot(view);
    const ast = viewSnapshot.query.ast;

    // Extract order from query AST - handle nested structures (options, order, etc.)
    const extractOrder = (queryAst: QueryAST.Query): readonly QueryAST.Order[] | undefined => {
      if (queryAst.type === 'order') {
        return queryAst.order;
      }
      if (queryAst.type === 'options') {
        return extractOrder(queryAst.query);
      }
      return undefined;
    };

    const orders = extractOrder(ast);
    if (orders && orders.length > 0) {
      const firstOrder = orders[0];
      if (firstOrder.kind === 'property') {
        // Find field by property path
        const field = this._projection.fields.find((f) => f.path === firstOrder.property);
        if (field) {
          return {
            fieldId: field.id,
            direction: firstOrder.direction,
          };
        }
      }
    }

    // Fallback to deprecated view.sort for backward compatibility
    return view.sort?.[0];
  }

  /**
   * Gets the row data at the specified display index.
   */
  public getRowAt(displayIndex: number): T | undefined {
    const sortedRows = this._sortedRows.value;
    if (displayIndex < 0 || displayIndex >= sortedRows.length) {
      return undefined;
    }

    return sortedRows[displayIndex];
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

  public get rowActions(): TableRowAction[] {
    return this._rowActions;
  }

  //
  // Initialisation
  //

  protected override async _open(): Promise<void> {
    await this._object.view.load();
    this.initializeColumnMeta();
    this.initializeEffects();
    await this._selection.open(this._ctx);
  }

  private initializeColumnMeta(): void {
    this._columnMeta = computed(() => {
      const fields = this._projection?.fields ?? [];
      const meta = Object.fromEntries(
        fields.map((field, index: number) => [index, { size: this.table.sizes[field.path] ?? 256, resizeable: true }]),
      );

      return {
        grid: meta,
        frozenColsStart: { 0: { size: 30, resizeable: false } },
        frozenColsEnd: { 0: { size: 32, resizeable: false } },
      };
    });
  }

  private initializeEffects(): void {
    const rowOrderWatcher = effect(() => {
      touch(this._rows.value);
      this._onRowOrderChange?.();
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
            // Use sorted rows for display index
            const sortedRows = this._sortedRows.value;
            const obj = sortedRows[row];
            this._projection?.fields.forEach((field) => touch(getValue(obj, field.path)));
            this._onCellUpdate?.({ row, col: start.col, plane: 'grid' });
          }),
        );
      }

      return () => rowEffects.forEach((cleanup) => cleanup());
    });
    this._ctx.onDispose(rowEffectManager);

    const draftRowsWatcher = effect(() => {
      touch(this._draftRows.value);
      // Notify grid that draft rows have changed
      this._onRowOrderChange?.();
    });
    this._ctx.onDispose(draftRowsWatcher);
  }

  //
  // Data
  //

  public setRows = (obj: T[]): void => {
    this._rows.value = obj;
  };

  public getRowCount = (): number => this._sortedRows.value.length;

  /**
   * @reactive
   */
  public getDraftRowCount = (): number => this._draftRows.value.length;

  // TODO(ZaymonFC): Return .value instead of exposing the signal.
  public get draftRows(): ReadonlySignal<DraftRow<T>[]> {
    return this._draftRows;
  }

  /**
   * Checks if a specific field path has validation errors for a given draft row.
   * @param draftRowIndex - The index of the draft row to check
   * @param fieldPath - The path of the field to check for validation errors
   * @returns true if the field has validation errors, false otherwise
   */
  public hasDraftRowValidationError(draftRowIndex: number, fieldPath: string): boolean {
    if (draftRowIndex < 0 || draftRowIndex >= this._draftRows.value.length) {
      return false;
    }

    const draftRow = this._draftRows.value[draftRowIndex];
    const validationErrors = draftRow.validationErrors || [];
    return validationErrors.some((error) => error.path === fieldPath);
  }

  public getColumnCount = (): number => this._projection?.fields.length ?? 0;

  public insertRow = (): InsertRowResult => {
    const result = this._onInsertRow?.();
    if (result === 'draft' && this._draftRows.value.length === 0) {
      this.createDraftRow();
    }
    return result ?? 'final';
  };

  private createDraftRow(): void {
    if (!this._projection) {
      return;
    }

    // NOTE(ZaymonFC): This is initialized with id because it's required in all schemata?
    const draftData = { id: ObjectId.random() } as any as T;
    const validationErrors = this.validateDraftRowData(draftData);

    const draftRow: DraftRow<T> = {
      data: draftData,
      valid: validationErrors.length === 0,
      validationErrors,
    };

    this._draftRows.value = [...this._draftRows.value, draftRow];
  }

  private validateDraftRow(draftRowIndex: number): void {
    if (draftRowIndex < 0 || draftRowIndex >= this._draftRows.value.length) {
      return;
    }

    const draftRow = this._draftRows.value[draftRowIndex];
    const validationErrors = this.validateDraftRowData(draftRow.data);

    const updatedDraftRow = {
      ...draftRow,
      valid: validationErrors.length === 0,
      validationErrors,
    };

    const newDraftRows = [...this._draftRows.value];
    newDraftRows[draftRowIndex] = updatedDraftRow;
    this._draftRows.value = newDraftRows;
  }

  private validateDraftRowData(data: T): ValidationError[] {
    const schema = toEffectSchema(this._projection.baseSchema);
    return validateSchema(schema, data) || [];
  }

  public commitDraftRow = (draftRowIndex: number): boolean => {
    if (draftRowIndex < 0 || draftRowIndex >= this._draftRows.value.length) {
      return false;
    }

    const draftRow = this._draftRows.value[draftRowIndex];
    if (!draftRow.valid) {
      return false;
    }

    const insertRowResult = this._onInsertRow?.(draftRow.data);

    if (insertRowResult === 'final') {
      const newDraftRows = this._draftRows.value.filter((_, index) => index !== draftRowIndex);
      this._draftRows.value = newDraftRows;
    }

    return insertRowResult === 'final';
  };

  public deleteRow = (rowIndex: number): void => {
    const sortedRows = this._sortedRows.value;
    const obj = sortedRows[rowIndex];
    const objectsToDelete = [];

    if (this.features.selection.enabled && this._selection.hasSelection.value) {
      const selectedRows = this._selection.getSelectedRows();
      objectsToDelete.push(...selectedRows);
    } else {
      objectsToDelete.push(obj);
    }

    this._onDeleteRows?.(rowIndex, objectsToDelete);
  };

  public handleRowAction = (actionId: string, rowIndex: number): void => {
    if (!this._onRowAction) {
      return;
    }

    const sortedRows = this._sortedRows.value;
    const data = sortedRows[rowIndex];

    if (data) {
      this._onRowAction(actionId, data);
    }
  };

  public getCellData = (cell: DxGridPosition): any => {
    const { col, row, plane } = cell;
    const fields = this._projection?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return undefined;
    }

    const field = fields[col];
    let value: any;

    if (plane === 'frozenRowsEnd') {
      // Get data from draft row
      if (row >= 0 && row < this._draftRows.value.length) {
        value = getValue(this._draftRows.value[row].data, field.path);
      } else {
        return undefined;
      }
    } else {
      // Get data from regular row (use sorted rows for display index)
      const sortedRows = this._sortedRows.value;
      value = getValue(sortedRows[row], field.path);
    }

    if (value == null) {
      return '';
    }

    const { props } = this._projection.getFieldProjection(field.id);
    switch (props.format) {
      case Format.TypeFormat.Ref: {
        if (!field.referencePath) {
          return ''; // TODO(burdon): Show error.
        }

        return getValue(value.target, field.referencePath);
      }

      default: {
        return formatForEditing({
          type: props.type,
          format: props.format,
          value,
        });
      }
    }
  };

  public validateCellData = async ({ col, row, plane }: DxGridPosition, value: any): Promise<ValidationResult> => {
    const fields = this._projection?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return { valid: false, error: 'Invalid column index' };
    }

    const field = fields[col];
    const { props } = this._projection.getFieldProjection(field.id);
    const transformedValue = editorTextToCellValue(props, value);

    const isDraftRow = plane === 'frozenRowsEnd';

    if (isDraftRow) {
      const isInvalidDraftRowIndex = row < 0 || row >= this._draftRows.value.length;
      if (isInvalidDraftRowIndex) {
        return { valid: false, error: 'Invalid draft row index' };
      }

      const draftRow = this._draftRows.value[row];
      const snapshot = { ...draftRow.data };
      setValue(snapshot, field.path, transformedValue);

      const validationErrors = this.validateDraftRowData(snapshot);
      // TODO(thure): These errors sometimes result in a useless message like “is missing” (what is missing?)
      if (validationErrors.length > 0) {
        const error = validationErrors.find((err) => err.path === field.path);
        if (error) {
          return { valid: false, error: error.message };
        }
      }
      return { valid: true };
    } else {
      const currentRow = this._rows.value[row];
      invariant(currentRow, 'Invalid row index');

      const snapshot = getSnapshot(currentRow);
      setValue(snapshot, field.path, transformedValue);

      const schema = Obj.getSchema(currentRow);
      invariant(schema);

      const validationResult = validateSchema(schema, snapshot);
      if (validationResult && validationResult.length > 0) {
        const error = validationResult[0];
        invariant(error.path === field.path);
        return { valid: false, error: error.message };
      }

      return { valid: true };
    }
  };

  public setCellData = (cell: DxGridPosition, value: any): void => {
    const { col, row, plane } = cell;
    const fields = this._projection?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return;
    }

    const field = fields[col];
    const { props } = this._projection.getFieldProjection(field.id);
    const transformedValue = editorTextToCellValue(props, value);

    // Special handling for Ref format to preserve existing behavior
    if (props.format === Format.TypeFormat.Ref && !isLiveObject(value)) {
      return;
    }

    if (plane === 'frozenRowsEnd') {
      // Update draft row data
      if (row >= 0 && row < this._draftRows.value.length) {
        setValue(this._draftRows.value[row].data, field.path, transformedValue);
        // Re-validate the draft row after the update
        this.validateDraftRow(row);
      }
    } else {
      // Update regular row data (use sorted rows for display index)
      const sortedRows = this._sortedRows.value;
      setValue(sortedRows[row], field.path, transformedValue);
    }
  };

  /**
   * Updates a cell's value using a transform function.
   * @param {DxGridPlanePosition} position - The position of the cell to update.
   * @param {(value: any) => any} update - A function that takes the current value and returns the updated value.
   */
  public updateCellData({ col, row }: DxGridPlanePosition, update: (value: any) => any): void {
    const fields = this._projection?.fields ?? [];
    const field = fields[col];
    const sortedRows = this._sortedRows.value;

    const value = getValue(sortedRows[row], field.path);
    const updatedValue = update(value);
    setValue(sortedRows[row], field.path, updatedValue);
  }

  /**
   * Gets the domain-appropriate cell type for a given cell position.
   * This abstracts away the low-level grid plane concepts and provides domain-specific types.
   * @param cell - The cell position to classify
   * @returns The domain-appropriate cell type
   */
  public getCellType(cell: DxGridPosition): TableCellType {
    switch (cell.plane) {
      case 'frozenRowsEnd':
        return 'draft';
      case 'frozenRowsStart':
        return 'header';
      case 'grid':
      default:
        return 'standard';
    }
  }

  /**
   * Convenience method to check if a cell is a draft cell.
   * @param cell - The cell position to check
   * @returns true if the cell is a draft cell, false otherwise
   */
  public isDraftCell(cell: DxGridPosition): boolean {
    return this.getCellType(cell) === 'draft';
  }

  //
  // Column Operations
  //

  public deleteColumn(fieldId: string): void {
    if (!this._projection) {
      return;
    }

    const field = this._projection?.fields.find((field) => field.id === fieldId);
    if (field && this._onDeleteColumn) {
      this._onDeleteColumn(field.id);
    }
  }

  //
  // Resize
  //

  public setColumnWidth(columnIndex: number, width: number): void {
    const fields = this._projection?.fields ?? [];
    if (columnIndex < fields.length) {
      const newWidth = Math.max(0, width);
      const field = fields[columnIndex];
      if (field) {
        this.table.sizes[field.path] = newWidth;
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
  // Sort operations
  //

  /**
   * Sets the sort order for a field in-memory (local to this instance).
   * Use saveView() to persist the sort to the view query.
   */
  public setSort(fieldId: string, direction: SortDirectionType): void {
    const field = this._projection.fields.find((f) => f.id === fieldId);
    if (!field) {
      return;
    }

    // Update in-memory sort (local changes)
    this._inMemorySort.value = {
      fieldId,
      direction,
    };
  }

  /**
   * Toggles the sort direction for a field in-memory.
   */
  public toggleSort(fieldId: string): void {
    const currentSort = this.sorting;
    if (!currentSort || currentSort.fieldId !== fieldId) {
      this.setSort(fieldId, 'asc');
      return;
    }

    const newDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
    this.setSort(fieldId, newDirection);
  }

  /**
   * Clears the in-memory sort order.
   */
  public clearSort(): void {
    this._inMemorySort.value = undefined;
  }

  /**
   * Saves the current in-memory sort to the view query AST.
   * This persists the sort so it becomes the default for all viewers.
   */
  public saveView(): void {
    const view = this.view;
    const inMemorySort = this._inMemorySort.value;

    // Snapshot view before accessing query.ast
    const viewSnapshot = Obj.getSnapshot(view);
    const currentQuery = Query.fromAst(viewSnapshot.query.ast);
    const baseQuery = this._getBaseQuery(currentQuery);

    if (inMemorySort) {
      // Find the field to get its path
      const field = this._projection.fields.find((f) => f.id === inMemorySort.fieldId);
      if (field) {
        // Persist sort to view.query.ast
        const newQuery = baseQuery.orderBy(Order.property<any>(field.path as string, inMemorySort.direction));
        view.query.ast = newQuery.ast;
      }
    } else {
      // Clear sort from view.query.ast
      view.query.ast = baseQuery.ast;
    }

    // Clear deprecated view.sort
    view.sort = [];

    // Clear in-memory sort since it's now persisted
    this._inMemorySort.value = undefined;
  }

  /**
   * Extracts the base query without order clauses.
   */
  private _getBaseQuery(query: Query.Any): Query.Any {
    const ast = query.ast;
    // If the query has an order clause, extract the inner query
    if (ast.type === 'order') {
      return Query.fromAst(ast.query);
    }
    return query;
  }

  /**
   * Checks if the view has unsaved changes (in-memory sort differs from persisted sort).
   * @reactive
   */
  public get viewDirty(): boolean {
    return this._viewDirty.value;
  }
}

const editorTextToCellValue = (props: PropertyType, value: any): any => {
  switch (props.format) {
    case Format.TypeFormat.Ref: {
      if (isLiveObject(value)) {
        return Ref.make(value);
      } else {
        return value;
      }
    }

    case Format.TypeFormat.SingleSelect: {
      const ids = extractTagIds(value);
      if (ids && ids.length > 0) {
        return ids[0];
      } else {
        return value;
      }
    }

    case Format.TypeFormat.MultiSelect: {
      const ids = extractTagIds(value);
      return ids || value;
    }

    default: {
      return parseValue({
        type: props.type,
        format: props.format,
        value,
      });
    }
  }
};

/**
 * Compares two values for sorting based on the field format.
 * Handles dates, numbers, and strings appropriately.
 */
const compareValues = (aValue: any, bValue: any, format: Format.TypeFormat, direction: SortDirectionType): number => {
  // Handle null/undefined values
  if (aValue === undefined || aValue === null) {
    return bValue === undefined || bValue === null ? 0 : 1;
  }
  if (bValue === undefined || bValue === null) {
    return -1;
  }

  let comparison = 0;

  // Handle dates chronologically if schema indicates date format
  const isDateFormat = format === Format.TypeFormat.DateTime || format === Format.TypeFormat.Date;
  if (isDateFormat) {
    const aDate = new Date(aValue);
    const bDate = new Date(bValue);
    if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
      comparison = aDate.getTime() - bDate.getTime();
    } else {
      // Fallback to string comparison if date parsing fails
      comparison = String(aValue).localeCompare(String(bValue));
    }
  }
  // Handle numbers if schema indicates number format
  else if (
    format === Format.TypeFormat.Number ||
    format === Format.TypeFormat.Integer ||
    format === Format.TypeFormat.Currency ||
    format === Format.TypeFormat.Percent ||
    format === Format.TypeFormat.Duration
  ) {
    const aNum = typeof aValue === 'number' ? aValue : Number(aValue);
    const bNum = typeof bValue === 'number' ? bValue : Number(bValue);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      comparison = aNum - bNum;
    } else {
      // Fallback to string comparison if number parsing fails
      comparison = String(aValue).localeCompare(String(bValue));
    }
  }
  // Default to string comparison
  else if (typeof aValue === 'string' && typeof bValue === 'string') {
    comparison = aValue.localeCompare(bValue);
  } else if (typeof aValue === 'number' && typeof bValue === 'number') {
    comparison = aValue - bValue;
  } else {
    comparison = String(aValue).localeCompare(String(bValue));
  }

  return direction === 'desc' ? -comparison : comparison;
};
