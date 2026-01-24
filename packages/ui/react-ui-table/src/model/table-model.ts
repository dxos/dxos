//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';

import { Resource } from '@dxos/context';
import { type Database, Format, Obj, Order, Query, type QueryAST, Ref } from '@dxos/echo';
import { type JsonProp, type JsonSchemaType, toEffectSchema } from '@dxos/echo/internal';
import { getValue, setValue } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { getSnapshot } from '@dxos/live-object';
import { type Label } from '@dxos/react-ui';
import { formatForEditing, parseValue } from '@dxos/react-ui-form';
import {
  type DxGridAxisMeta,
  type DxGridPlanePosition,
  type DxGridPlaneRange,
  type DxGridPosition,
} from '@dxos/react-ui-grid';
import { type ProjectionModel, type PropertyType, type ValidationError, type View, validateSchema } from '@dxos/schema';

import { type Table } from '../types';
import { extractOrder } from '../util';
import { compareValues } from '../util/sort';
import { extractTagIds } from '../util/tag';

/**
 * Field sort configuration.
 */
export type FieldSortType = {
  fieldId: string;
  direction: QueryAST.OrderDirection;
};

import { type SelectionMode, SelectionModel } from './selection-model';

/**
 * Callback type for wrapping mutations in Obj.change().
 * Contains separate callbacks for table object and row mutations.
 */
export type TableChangeCallback<T extends TableRow> = {
  /** Callback to wrap table object mutations. */
  table: (mutate: (mutableTable: Table.Table) => void) => void;
  /** Callback to wrap row mutations. */
  row: (row: T, mutate: (mutableRow: T) => void) => void;
};

/**
 * Creates a change callback for ECHO-backed table and rows.
 * Use this when the table and rows are stored in the ECHO database.
 */
export const createEchoChangeCallback = <T extends TableRow>(table: Table.Table): TableChangeCallback<T> => ({
  table: (mutate) => Obj.change(table, (mutableTable) => mutate(mutableTable as unknown as Table.Table)),
  row: (row, mutate) => {
    if (Obj.isObject(row)) {
      Obj.change(row, (mutableRow) => mutate(mutableRow as T));
    } else {
      mutate(row);
    }
  },
});

/**
 * Creates a change callback that directly mutates objects without wrapping.
 * Use this for plain JavaScript objects (tests, non-ECHO scenarios).
 */
export const createDirectChangeCallback = <T extends TableRow>(table: Table.Table): TableChangeCallback<T> => ({
  table: (mutate) => mutate(table),
  row: (row, mutate) => mutate(row),
});

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
  registry: Registry.Registry;
  object: Table.Table;
  projection: ProjectionModel;
  db?: Database.Database;
  /**
   * Callbacks to wrap mutations in Obj.change().
   * Use createEchoChangeCallback() for ECHO-backed objects or createDirectChangeCallback() for plain objects.
   */
  change?: TableChangeCallback<T>;
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
  private readonly _registry: Registry.Registry;
  private readonly _object: Table.Table;
  private readonly _projection: ProjectionModel;
  private readonly _db?: Database.Database;
  private readonly _change: TableChangeCallback<T>;

  private readonly _visibleRange: Atom.Writable<DxGridPlaneRange>;

  private readonly _onInsertRow?: (data?: any) => InsertRowResult;
  private readonly _onDeleteRows?: TableModelProps<T>['onDeleteRows'];
  private readonly _onDeleteColumn?: TableModelProps<T>['onDeleteColumn'];
  private readonly _onCellUpdate?: TableModelProps<T>['onCellUpdate'];
  private readonly _onRowOrderChange?: TableModelProps<T>['onRowOrderChange'];
  private readonly _onRowAction?: TableModelProps<T>['onRowAction'];
  private readonly _rowActions: TableRowAction[];
  private readonly _features: TableFeatures;

  private readonly _rows: Atom.Writable<T[]>;
  private readonly _draftRows: Atom.Writable<DraftRow<T>[]>;
  // In-memory sort state - changes are local until saved.
  private readonly _inMemorySort: Atom.Writable<FieldSortType | undefined>;
  // Derived atom for persisted sort from view.query.ast.
  private readonly _persistedSort: Atom.Atom<FieldSortType | undefined>;
  // Derived atom for current sort (in-memory takes precedence over persisted).
  private readonly _sorting: Atom.Atom<FieldSortType | undefined>;
  // Derived atom for sorted rows (used by rows getter and SelectionModel).
  private readonly _sortedRows: Atom.Atom<T[]>;
  // Derived atom for viewDirty state.
  private readonly _viewDirty: Atom.Atom<boolean>;

  private _pinnedRows: NonNullable<TableModelProps<T>['pinnedRows']>;
  private _selection!: SelectionModel<T>;
  private _columnMeta?: Atom.Atom<DxGridAxisMeta>;
  // Counter atom that increments when cells are updated - allows UI to react to cell changes.
  private readonly _cellUpdateCounter: Atom.Writable<number>;

  constructor({
    registry,
    object,
    projection,
    db,
    change,
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
    this._registry = registry;
    this._object = object;
    this._projection = projection;
    this._projection.normalizeView();
    this._db = db;
    this._change = change ?? createEchoChangeCallback<T>(object);

    // TODO(ZaymonFC): Use our more robust config merging module?
    this._features = { ...defaultFeatures, ...features };

    invariant(
      !(this._features.dataEditable && this._features.selection.enabled && this._features.selection.mode === 'single'),
      'Single selection is not compatible with editable tables.',
    );

    // Initialize writable atoms.
    this._visibleRange = Atom.make<DxGridPlaneRange>({
      start: { row: 0, col: 0 },
      end: { row: 0, col: 0 },
    });
    this._rows = Atom.make<T[]>([]);
    this._draftRows = Atom.make<DraftRow<T>[]>([]);
    this._inMemorySort = Atom.make<FieldSortType | undefined>(undefined);
    this._cellUpdateCounter = Atom.make<number>(0);

    // Create derived atom for persisted sort from view.query.ast.
    this._persistedSort = Atom.make((_get) => {
      // Note: This depends on the view being loaded and the projection being set.
      // The view is loaded in _open().
      const viewSnapshot = Obj.getSnapshot(this.view);
      const ast = viewSnapshot.query.ast;
      const orders = extractOrder(ast);

      if (orders && orders.length > 0) {
        const firstOrder = orders[0];
        if (firstOrder.kind === 'property') {
          // Find field by property path.
          const field = this._projection.getFields().find((f) => f.path === firstOrder.property);
          if (field) {
            return {
              fieldId: field.id,
              direction: firstOrder.direction,
            };
          }
        }
      }

      return undefined;
    });

    // Create derived atom for current sort (in-memory takes precedence over persisted).
    this._sorting = Atom.make((get) => {
      const inMemorySort = get(this._inMemorySort);
      return inMemorySort ?? get(this._persistedSort);
    });

    // Create derived atom for sorted rows (used by rows getter and SelectionModel).
    this._sortedRows = Atom.make((get) => {
      const rows = get(this._rows);
      const sort = get(this._sorting);

      if (!sort || rows.length === 0) {
        return rows;
      }

      const field = this._projection.getFields().find((f) => f.id === sort.fieldId);
      if (!field) {
        return rows;
      }

      // Get field projection to check format.
      const fieldProjection = this._projection.getFieldProjection(field.id);

      const sorted = [...rows].sort((a, b) => {
        const aValue = getValue(a, field.path);
        const bValue = getValue(b, field.path);
        return compareValues(aValue, bValue, fieldProjection.props.format, sort.direction);
      });

      return sorted;
    });

    this._selection = new SelectionModel(
      this._registry,
      this._sortedRows,
      this._features.selection.mode ?? 'multiple',
      initialSelection,
      () => this._onRowOrderChange?.(),
    );

    // Create derived atom for viewDirty.
    this._viewDirty = Atom.make((get) => {
      const inMemorySort = get(this._inMemorySort);
      if (!inMemorySort) {
        return false;
      }

      const persisted = get(this._persistedSort);
      if (!persisted) {
        return true; // In-memory sort but no persisted sort.
      }

      return inMemorySort.fieldId !== persisted.fieldId || inMemorySort.direction !== persisted.direction;
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
   * Atom for reactive access to rows with in-memory sorting applied.
   */
  public get rows(): Atom.Atom<T[]> {
    return this._sortedRows;
  }

  /**
   * Gets rows with in-memory sorting applied.
   * In-memory sort is local to this instance until saved.
   */
  public getRows(): T[] {
    return this._registry.get(this._sortedRows);
  }

  /** Atom for reactive access to cell changes. */
  public get cellUpdate(): Atom.Atom<number> {
    return this._cellUpdateCounter;
  }

  /**
   * Change a row using the configured change callback.
   * Use this instead of directly mutating to ensure consistent mutation handling.
   */
  public changeRow(row: T, mutate: (mutableRow: T) => void): void {
    this._change.row(row, mutate);
  }

  public get features(): TableFeatures {
    return this._features;
  }

  /**
   * Gets the current sort state.
   * Priority: in-memory sort (local changes) > persisted sort (from query AST).
   */
  public getSorting(): FieldSortType | undefined {
    return this._registry.get(this._sorting);
  }

  /**
   * Gets the row data at the specified display index.
   */
  public getRowAt(displayIndex: number): T | undefined {
    const sortedRows = this._registry.get(this._sortedRows);
    if (displayIndex < 0 || displayIndex >= sortedRows.length) {
      return undefined;
    }

    return sortedRows[displayIndex];
  }

  public get pinnedRows(): NonNullable<TableModelProps<T>['pinnedRows']> {
    return this._pinnedRows;
  }

  public get columnMeta(): Atom.Atom<DxGridAxisMeta> {
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
    invariant(this._object.view.target, 'View must be loaded before initializing column meta');

    // Derive columnMeta from the projection's fields atom - updates when fields change.
    // The projection.fields atom handles subscriptions to view changes internally.
    this._columnMeta = Atom.make((get) => {
      const fields = get(this._projection.fields);
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
    // Subscribe to rows changes to notify row order changed.
    const rowsUnsubscribe = this._registry.subscribe(this._rows, () => {
      this._onRowOrderChange?.();
    });
    this._ctx.onDispose(rowsUnsubscribe);

    // Track row subscriptions for cleanup.
    const rowSubscriptions = new Map<string, () => void>();

    // Subscribe to visible range changes to set up row subscriptions.
    const visibleRangeUnsubscribe = this._registry.subscribe(this._visibleRange, () => {
      // Unsubscribe from old row subscriptions.
      for (const [id, unsub] of rowSubscriptions) {
        unsub();
        rowSubscriptions.delete(id);
      }

      const { start, end } = this._registry.get(this._visibleRange);
      const sortedRows = this._registry.get(this._sortedRows);

      // Subscribe to each visible row's changes.
      for (let row = start.row; row <= end.row && row < sortedRows.length; row++) {
        const obj = sortedRows[row];
        if (Obj.isObject(obj) && !rowSubscriptions.has(obj.id)) {
          const unsub = Obj.subscribe(obj, () => {
            // Increment cell update counter to notify UI of changes.
            this._registry.set(this._cellUpdateCounter, this._registry.get(this._cellUpdateCounter) + 1);
            this._onCellUpdate?.({ row, col: start.col, plane: 'grid' });
          });
          rowSubscriptions.set(obj.id, unsub);
        }
      }
    });
    this._ctx.onDispose(() => {
      visibleRangeUnsubscribe();
      for (const unsub of rowSubscriptions.values()) {
        unsub();
      }
    });

    // Subscribe to draft rows changes to notify grid.
    const draftRowsUnsubscribe = this._registry.subscribe(this._draftRows, () => {
      this._onRowOrderChange?.();
    });
    this._ctx.onDispose(draftRowsUnsubscribe);
  }

  //
  // Data
  //

  public setRows = (obj: T[]): void => {
    this._registry.set(this._rows, obj);
  };

  public getRowCount = (): number => this._registry.get(this._sortedRows).length;

  public getDraftRowCount(): number {
    return this._registry.get(this._draftRows).length;
  }

  /** Atom for reactive access to draft rows. */
  public get draftRows(): Atom.Atom<DraftRow<T>[]> {
    return this._draftRows;
  }

  /** Gets the current draft rows. */
  public getDraftRows(): DraftRow<T>[] {
    return this._registry.get(this._draftRows);
  }

  /**
   * Checks if a specific field path has validation errors for a given draft row.
   * @param draftRowIndex - The index of the draft row to check
   * @param fieldPath - The path of the field to check for validation errors
   * @returns true if the field has validation errors, false otherwise
   */
  public hasDraftRowValidationError(draftRowIndex: number, fieldPath: string): boolean {
    if (draftRowIndex < 0 || draftRowIndex >= this._registry.get(this._draftRows).length) {
      return false;
    }

    const draftRow = this._registry.get(this._draftRows)[draftRowIndex];
    const validationErrors = draftRow.validationErrors || [];
    return validationErrors.some((error) => error.path === fieldPath);
  }

  public getColumnCount = (): number => this._projection?.getFields().length ?? 0;

  public insertRow = (): InsertRowResult => {
    const result = this._onInsertRow?.();
    if (result === 'draft' && this._registry.get(this._draftRows).length === 0) {
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

    this._registry.set(this._draftRows, [...this._registry.get(this._draftRows), draftRow]);
  }

  private validateDraftRow(draftRowIndex: number): void {
    if (draftRowIndex < 0 || draftRowIndex >= this._registry.get(this._draftRows).length) {
      return;
    }

    const draftRow = this._registry.get(this._draftRows)[draftRowIndex];
    const validationErrors = this.validateDraftRowData(draftRow.data);

    const updatedDraftRow = {
      ...draftRow,
      valid: validationErrors.length === 0,
      validationErrors,
    };

    const newDraftRows = [...this._registry.get(this._draftRows)];
    newDraftRows[draftRowIndex] = updatedDraftRow;
    this._registry.set(this._draftRows, newDraftRows);
  }

  private validateDraftRowData(data: T): ValidationError[] {
    const schema = toEffectSchema(this._projection.baseSchema);
    return validateSchema(schema, data) || [];
  }

  public commitDraftRow = (draftRowIndex: number): boolean => {
    if (draftRowIndex < 0 || draftRowIndex >= this._registry.get(this._draftRows).length) {
      return false;
    }

    const draftRow = this._registry.get(this._draftRows)[draftRowIndex];
    if (!draftRow.valid) {
      return false;
    }

    const insertRowResult = this._onInsertRow?.(draftRow.data);

    if (insertRowResult === 'final') {
      const newDraftRows = this._registry.get(this._draftRows).filter((_, index) => index !== draftRowIndex);
      this._registry.set(this._draftRows, newDraftRows);
    }

    return insertRowResult === 'final';
  };

  public deleteRow = (rowIndex: number): void => {
    const sortedRows = this._registry.get(this._sortedRows);
    const obj = sortedRows[rowIndex];
    const objectsToDelete = [];

    if (this.features.selection.enabled && this._selection.hasSelection) {
      const selectedRows = this._selection.getSelectedRows();
      objectsToDelete.push(...selectedRows);
    } else if (obj) {
      objectsToDelete.push(obj);
    }

    if (objectsToDelete.length > 0) {
      this._onDeleteRows?.(rowIndex, objectsToDelete);
    }
  };

  public handleRowAction = (actionId: string, rowIndex: number): void => {
    if (!this._onRowAction) {
      return;
    }

    const sortedRows = this._registry.get(this._sortedRows);
    const data = sortedRows[rowIndex];

    if (data) {
      this._onRowAction(actionId, data);
    }
  };

  public getCellData = (cell: DxGridPosition): any => {
    const { col, row, plane } = cell;
    const fields = this._projection?.getFields() ?? [];
    if (col < 0 || col >= fields.length) {
      return undefined;
    }

    const field = fields[col];
    let value: any;

    if (plane === 'frozenRowsEnd') {
      // Get data from draft row
      if (row >= 0 && row < this._registry.get(this._draftRows).length) {
        value = getValue(this._registry.get(this._draftRows)[row].data, field.path);
      } else {
        return undefined;
      }
    } else {
      // Get data from regular row (use sorted rows for display index)
      const sortedRows = this._registry.get(this._sortedRows);
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
    const fields = this._projection?.getFields() ?? [];
    if (col < 0 || col >= fields.length) {
      return { valid: false, error: 'Invalid column index' };
    }

    const field = fields[col];
    const { props } = this._projection.getFieldProjection(field.id);
    const transformedValue = editorTextToCellValue(props, value);

    const isDraftRow = plane === 'frozenRowsEnd';

    if (isDraftRow) {
      const isInvalidDraftRowIndex = row < 0 || row >= this._registry.get(this._draftRows).length;
      if (isInvalidDraftRowIndex) {
        return { valid: false, error: 'Invalid draft row index' };
      }

      const draftRow = this._registry.get(this._draftRows)[row];
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
      const currentRow = this._registry.get(this._rows)[row];
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
    const fields = this._projection?.getFields() ?? [];
    if (col < 0 || col >= fields.length) {
      return;
    }

    const field = fields[col];
    const { props } = this._projection.getFieldProjection(field.id);
    const transformedValue = editorTextToCellValue(props, value);

    // Special handling for Ref format to preserve existing behavior
    if (props.format === Format.TypeFormat.Ref && !Obj.isObject(value)) {
      return;
    }

    if (plane === 'frozenRowsEnd') {
      // Update draft row data (draft rows are plain objects, not ECHO objects).
      if (row >= 0 && row < this._registry.get(this._draftRows).length) {
        setValue(this._registry.get(this._draftRows)[row].data, field.path, transformedValue);
        // Re-validate the draft row after the update
        this.validateDraftRow(row);
      }
    } else {
      // Update regular row data (use sorted rows for display index)
      const sortedRows = this._registry.get(this._sortedRows);
      const rowData = sortedRows[row];
      this._change.row(rowData, (mutableRow) => {
        setValue(mutableRow, field.path, transformedValue);
      });
    }
  };

  /**
   * Updates a cell's value using a transform function.
   * @param {DxGridPlanePosition} position - The position of the cell to update.
   * @param {(value: any) => any} update - A function that takes the current value and returns the updated value.
   */
  public updateCellData({ col, row }: DxGridPlanePosition, update: (value: any) => any): void {
    const fields = this._projection?.getFields() ?? [];
    const field = fields[col];
    const sortedRows = this._registry.get(this._sortedRows);
    const rowData = sortedRows[row];

    const value = getValue(rowData, field.path);
    const updatedValue = update(value);
    this._change.row(rowData, (mutableRow) => {
      setValue(mutableRow, field.path, updatedValue);
    });
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

    const field = this._projection?.getFields().find((field) => field.id === fieldId);
    if (field && this._onDeleteColumn) {
      this._onDeleteColumn(field.id);
    }
  }

  //
  // Resize
  //

  public setColumnWidth(columnIndex: number, width: number): void {
    const fields = this._projection?.getFields() ?? [];
    if (columnIndex < fields.length) {
      const newWidth = Math.max(0, width);
      const field = fields[columnIndex];
      if (field) {
        this._change.table((mutableTable) => {
          mutableTable.sizes[field.path] = newWidth;
        });
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
  public setSort(fieldId: string, direction: QueryAST.OrderDirection): void {
    const field = this._projection.getFields().find((f) => f.id === fieldId);
    if (!field) {
      return;
    }

    // Update in-memory sort (local changes).
    this._registry.set(this._inMemorySort, {
      fieldId,
      direction,
    });
  }

  /**
   * Toggles the sort direction for a field in-memory.
   */
  public toggleSort(fieldId: string): void {
    const currentSort = this.getSorting();
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
    this._registry.set(this._inMemorySort, undefined);
  }

  /**
   * Saves the current in-memory sort to the view query AST.
   * This persists the sort so it becomes the default for all viewers.
   */
  public saveView(): void {
    const view = this.view;
    const inMemorySort = this._registry.get(this._inMemorySort);

    // Snapshot view before accessing query.ast
    const viewSnapshot = Obj.getSnapshot(view);
    const currentQuery = Query.fromAst(viewSnapshot.query.ast);
    const baseQuery = this._getBaseQuery(currentQuery);

    if (inMemorySort) {
      // Find the field to get its path
      const field = this._projection.getFields().find((f) => f.id === inMemorySort.fieldId);
      if (field) {
        // Persist sort to view.query.ast
        const newQuery = baseQuery.orderBy(Order.property<any>(field.path as string, inMemorySort.direction));
        view.query.ast = newQuery.ast;
      }
    } else {
      // Clear sort from view.query.ast
      view.query.ast = baseQuery.ast;
    }

    // Clear in-memory sort since it's now persisted.
    this._registry.set(this._inMemorySort, undefined);
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
   */
  public getViewDirty(): boolean {
    return this._registry.get(this._viewDirty);
  }
}

const editorTextToCellValue = (props: PropertyType, value: any): any => {
  switch (props.format) {
    case Format.TypeFormat.Ref: {
      if (Obj.isObject(value)) {
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
