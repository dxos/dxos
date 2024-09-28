//
// Copyright 2024 DXOS.org
//

import { DetailedCellError, ExportedCellChange } from 'hyperformula';
import { type SimpleCellRange } from 'hyperformula/typings/AbsoluteCellRange';
import { type SimpleCellAddress } from 'hyperformula/typings/Cell';
import { type SimpleDate, type SimpleDateTime } from 'hyperformula/typings/DateTimeHelper';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type FunctionManager } from './functions';
import {
  addressFromA1Notation,
  addressToA1Notation,
  type CellAddress,
  type CellRange,
  MAX_COLUMNS,
  MAX_ROWS,
} from '../defs';
import { addressFromIndex, addressToIndex, initialize, insertIndices, ReadonlyException } from '../defs';
import { type ComputeGraph } from '../graph';
import { type CellScalarValue, type CellValue, type SheetType, ValueTypeEnum } from '../types';

const typeMap: Record<string, ValueTypeEnum> = {
  BOOLEAN: ValueTypeEnum.Boolean,
  NUMBER_RAW: ValueTypeEnum.Number,
  NUMBER_PERCENT: ValueTypeEnum.Percent,
  NUMBER_CURRENCY: ValueTypeEnum.Currency,
  NUMBER_DATETIME: ValueTypeEnum.DateTime,
  NUMBER_DATE: ValueTypeEnum.Date,
  NUMBER_TIME: ValueTypeEnum.Time,
};

const getTopLeft = (range: CellRange) => {
  const to = range.to ?? range.from;
  return { row: Math.min(range.from.row, to.row), column: Math.min(range.from.column, to.column) };
};

const toSimpleCellAddress = (sheet: number, cell: CellAddress): SimpleCellAddress => ({
  sheet,
  row: cell.row,
  col: cell.column,
});

const toModelRange = (sheet: number, range: CellRange): SimpleCellRange => ({
  start: toSimpleCellAddress(sheet, range.from),
  end: toSimpleCellAddress(sheet, range.to ?? range.from),
});

export type SheetModelOptions = {
  readonly?: boolean;
};

/**
 * Spreadsheet data model.
 *
 * [ComputeGraphContext] > [SheetContext]:[SheetModel] > [Sheet.Root]
 */
export class SheetModel {
  public readonly id = `model-${PublicKey.random().truncate()}`;

  public readonly update = new Event();

  /**
   * Formula engine.
   * Acts as a write through cache for scalar and computed values.
   */
  private readonly _sheetId: number;

  private _ctx?: Context = undefined;

  constructor(
    private readonly _graph: ComputeGraph,
    private readonly _sheet: SheetType,
    private readonly _functions: FunctionManager,
    private readonly _options: SheetModelOptions = {},
  ) {
    // Sheet for this object.
    const name = this._sheet.id;
    if (!this._graph.hf.doesSheetExist(name)) {
      this._graph.hf.addSheet(name);
    }
    this._sheetId = this._graph.hf.getSheetId(name)!;
    this.reset();
  }

  get graph() {
    return this._graph;
  }

  get sheet() {
    return this._sheet;
  }

  get readonly() {
    return this._options.readonly;
  }

  get bounds() {
    return {
      rows: this._sheet.rows.length,
      columns: this._sheet.columns.length,
    };
  }

  get functions() {
    return this._functions;
  }

  get initialized(): boolean {
    return !!this._ctx;
  }

  /**
   * Initialize sheet and engine.
   */
  async initialize() {
    log('initialize', { id: this.id });
    invariant(!this.initialized, 'Already initialized.');
    this._ctx = new Context(); // TODO(burdon): Chain functions context.
    initialize(this._sheet);

    // Listen for function updates.
    await this._functions.initialize();
    this._ctx.onDispose(this._functions.update.on(() => this.update.emit()));

    // Listen for model updates (e.g., async calculations).
    this._ctx.onDispose(this._graph.update.on(() => this.update.emit()));

    this.reset();
    return this;
  }

  async destroy() {
    log('destroy', { id: this.id });
    await this._functions.destroy();
    if (this._ctx) {
      await this._ctx.dispose();
      this._ctx = undefined;
    }
  }

  /**
   * Update engine.
   * NOTE: This resets the undo history.
   * @deprecated
   */
  reset() {
    this._graph.hf.clearSheet(this._sheetId);
    Object.entries(this._sheet.cells).forEach(([key, { value }]) => {
      const { column, row } = addressFromIndex(this._sheet, key);
      if (typeof value === 'string' && value.charAt(0) === '=') {
        value = this._functions.mapFunctionBindingToFormula(
          this._functions.mapFunctionBindingFromId(this.mapFormulaIndicesToRefs(value)),
        );
      }

      this._graph.hf.setCellContents({ sheet: this._sheetId, row, col: column }, value);
    });
  }

  /**
   * Recalculate formulas.
   * NOTE: This resets the undo history.
   * https://hyperformula.handsontable.com/guide/volatile-functions.html#volatile-actions
   * @deprecated
   */
  // TODO(burdon): Remove.
  recalculate() {
    this._graph.hf.rebuildAndRecalculate();
  }

  insertRows(i: number, n = 1) {
    insertIndices(this._sheet.rows, i, n, MAX_ROWS);
    this.reset();
  }

  insertColumns(i: number, n = 1) {
    insertIndices(this._sheet.columns, i, n, MAX_COLUMNS);
    this.reset();
  }

  //
  // Undoable actions.
  // TODO(burdon): Group undoable methods; consistently update hf/sheet.
  //
  /**
   * Clear range of values.
   */
  clear(range: CellRange) {
    const topLeft = getTopLeft(range);
    const values = this._iterRange(range, () => null);
    this._graph.hf.setCellContents(toSimpleCellAddress(this._sheetId, topLeft), values);
    this._iterRange(range, (cell) => {
      const idx = addressToIndex(this._sheet, cell);
      delete this._sheet.cells[idx];
    });
  }

  cut(range: CellRange) {
    this._graph.hf.cut(toModelRange(this._sheetId, range));
    this._iterRange(range, (cell) => {
      const idx = addressToIndex(this._sheet, cell);
      delete this._sheet.cells[idx];
    });
  }

  copy(range: CellRange) {
    this._graph.hf.copy(toModelRange(this._sheetId, range));
  }

  paste(cell: CellAddress) {
    if (!this._graph.hf.isClipboardEmpty()) {
      const changes = this._graph.hf.paste(toSimpleCellAddress(this._sheetId, cell));
      for (const change of changes) {
        if (change instanceof ExportedCellChange) {
          const { address, newValue } = change;
          const idx = addressToIndex(this._sheet, { row: address.row, column: address.col });
          this._sheet.cells[idx] = { value: newValue };
        }
      }
    }
  }

  // TODO(burdon): Display undo/redo state.
  undo() {
    if (this._graph.hf.isThereSomethingToUndo()) {
      this._graph.hf.undo();
      this.update.emit();
    }
  }

  redo() {
    if (this._graph.hf.isThereSomethingToRedo()) {
      this._graph.hf.redo();
      this.update.emit();
    }
  }

  /**
   * Get value from sheet.
   */
  getCellValue(cell: CellAddress): CellScalarValue {
    const idx = addressToIndex(this._sheet, cell);
    return this._sheet.cells[idx]?.value ?? null;
  }

  /**
   * Get value as a string for editing.
   */
  getCellText(cell: CellAddress): string | undefined {
    const value = this.getCellValue(cell);
    if (value == null) {
      return undefined;
    }

    if (typeof value === 'string' && value.charAt(0) === '=') {
      return this._functions.mapFunctionBindingFromId(this.mapFormulaIndicesToRefs(value));
    } else {
      return String(value);
    }
  }

  /**
   * Get array of raw values from sheet.
   */
  getCellValues(range: CellRange): CellScalarValue[][] {
    return this._iterRange(range, (cell) => this.getCellValue(cell));
  }

  /**
   * Gets the regular or computed value from the engine.
   */
  getValue(cell: CellAddress): CellScalarValue {
    // Applies rounding and post-processing.
    const value = this._graph.hf.getCellValue(toSimpleCellAddress(this._sheetId, cell));
    if (value instanceof DetailedCellError) {
      return value.toString();
    }

    return value;
  }

  /**
   * Get value type.
   */
  getValueType(cell: CellAddress): ValueTypeEnum {
    const addr = toSimpleCellAddress(this._sheetId, cell);
    const type = this._graph.hf.getCellValueDetailedType(addr);
    return typeMap[type];
  }

  /**
   * Sets the value, updating the sheet and engine.
   */
  setValue(cell: CellAddress, value: CellScalarValue) {
    if (this._options.readonly) {
      throw new ReadonlyException();
    }

    // Reallocate if > current bounds.
    let refresh = false;
    if (cell.row >= this._sheet.rows.length) {
      insertIndices(this._sheet.rows, cell.row, 1, MAX_ROWS);
      refresh = true;
    }
    if (cell.column >= this._sheet.columns.length) {
      insertIndices(this._sheet.columns, cell.column, 1, MAX_COLUMNS);
      refresh = true;
    }

    if (refresh) {
      // TODO(burdon): Remove.
      this.reset();
    }

    // Insert into engine.
    this._graph.hf.setCellContents({ sheet: this._sheetId, row: cell.row, col: cell.column }, [
      [
        typeof value === 'string' && value.charAt(0) === '='
          ? this._functions.mapFunctionBindingToFormula(value)
          : value,
      ],
    ]);

    // Insert into sheet.
    const idx = addressToIndex(this._sheet, cell);
    if (value === undefined || value === null) {
      delete this._sheet.cells[idx];
    } else {
      if (typeof value === 'string' && value.charAt(0) === '=') {
        value = this._functions.mapFunctionBindingToId(this.mapFormulaRefsToIndices(value));
      }

      this._sheet.cells[idx] = { value };
    }
  }

  /**
   * Sets values from a simple map.
   */
  setValues(values: Record<string, CellValue>) {
    Object.entries(values).forEach(([key, { value }]) => {
      this.setValue(addressFromA1Notation(key), value);
    });
  }

  /**
   * Iterate range.
   */
  private _iterRange(range: CellRange, cb: (cell: CellAddress) => CellScalarValue | void): CellScalarValue[][] {
    const to = range.to ?? range.from;
    const rowRange = [Math.min(range.from.row, to.row), Math.max(range.from.row, to.row)];
    const columnRange = [Math.min(range.from.column, to.column), Math.max(range.from.column, to.column)];
    const rows: CellScalarValue[][] = [];
    for (let row = rowRange[0]; row <= rowRange[1]; row++) {
      const rowCells: CellScalarValue[] = [];
      for (let column = columnRange[0]; column <= columnRange[1]; column++) {
        const value = cb({ row, column });
        if (value !== undefined) {
          rowCells.push(value);
        }
      }

      rows.push(rowCells);
    }

    return rows;
  }

  // TODO(burdon): Delete index.
  private _deleteIndices(indices: string[], i: number, n: number) {
    throw new Error('Not implemented');
  }

  // TODO(burdon): Move. Cannot use fractional without changing. Switch back to using unique IDs?
  private _moveIndices(indices: string[], i: number, j: number, n: number) {
    throw new Error('Not implemented');
  }

  //
  // Indices.
  //

  /**
   * Map from A1 notation to indices.
   */
  mapFormulaRefsToIndices(formula: string): string {
    invariant(formula.charAt(0) === '=');
    return formula.replace(/([a-zA-Z]+)([0-9]+)/g, (match) => {
      return addressToIndex(this._sheet, addressFromA1Notation(match));
    });
  }

  /**
   * Map from indices to A1 notation.
   */
  mapFormulaIndicesToRefs(formula: string): string {
    invariant(formula.charAt(0) === '=');
    return formula.replace(/([a-zA-Z0-9]+)@([a-zA-Z0-9]+)/g, (idx) => {
      return addressToA1Notation(addressFromIndex(this._sheet, idx));
    });
  }

  //
  // Values
  //

  /**
   * https://hyperformula.handsontable.com/guide/date-and-time-handling.html#example
   * https://hyperformula.handsontable.com/api/interfaces/configparams.html#nulldate
   * NOTE: TODAY() is number of FULL days since nullDate. It will typically be -1 days from NOW().
   */
  toLocalDate(num: number): Date {
    const { year, month, day, hours, minutes, seconds } = this.toDateTime(num);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }

  toDateTime(num: number): SimpleDateTime {
    return this._graph.hf.numberToDateTime(num) as SimpleDateTime;
  }

  toDate(num: number): SimpleDate {
    return this._graph.hf.numberToDate(num) as SimpleDate;
  }

  toTime(num: number): SimpleDate {
    return this._graph.hf.numberToTime(num) as SimpleDate;
  }
}
