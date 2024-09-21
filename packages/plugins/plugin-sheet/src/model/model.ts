//
// Copyright 2024 DXOS.org
//

import { DetailedCellError, ExportedCellChange } from 'hyperformula';
import { type SimpleCellRange } from 'hyperformula/typings/AbsoluteCellRange';
import { type SimpleCellAddress } from 'hyperformula/typings/Cell';
import { type SimpleDate, type SimpleDateTime } from 'hyperformula/typings/DateTimeHelper';

import { Event } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type FunctionType } from '@dxos/plugin-script/types';

import { defaultFunctions, type FunctionDefinition } from './functions';
import { addressFromA1Notation, addressToA1Notation, type CellAddress, type CellRange } from './types';
import { createIndices, RangeException, ReadonlyException } from './util';
import { type ComputeGraph } from '../components';
import { type CellScalarValue, type CellValue, type SheetType, ValueTypeEnum } from '../types';

const DEFAULT_ROWS = 100;
const DEFAULT_COLUMNS = 26;

export type CellIndex = string;

export type CellContentValue = number | string | boolean | null;

export type SheetModelOptions = {
  readonly?: boolean;
  rows: number;
  columns: number;
  mapFormulaBindingToId: (functions: FunctionType[]) => (formula: string) => string;
  mapFormulaBindingFromId: (functions: FunctionType[]) => (formula: string) => string;
};

const typeMap: Record<string, ValueTypeEnum> = {
  BOOLEAN: ValueTypeEnum.Boolean,
  NUMBER_RAW: ValueTypeEnum.Number,
  NUMBER_PERCENT: ValueTypeEnum.Percent,
  NUMBER_CURRENCY: ValueTypeEnum.Currency,
  NUMBER_DATETIME: ValueTypeEnum.DateTime,
  NUMBER_DATE: ValueTypeEnum.Date,
  NUMBER_TIME: ValueTypeEnum.Time,
};

export const defaultOptions: SheetModelOptions = {
  rows: 50,
  columns: 26,
  mapFormulaBindingFromId: () => (formula) => formula,
  mapFormulaBindingToId: () => (formula) => formula,
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

/**
 * Spreadsheet data model.
 *
 * [ComputeGraphContext] > [SheetContext]:[SheetModel] > [Sheet.Root]
 */
export class SheetModel {
  public readonly id = `model-${PublicKey.random().truncate()}`;
  private _ctx?: Context = undefined;

  /**
   * Formula engine.
   * Acts as a write through cache for scalar and computed values.
   */
  private readonly _sheetId: number;
  private readonly _options: SheetModelOptions;
  private _functions: FunctionType[] = [];

  public readonly update = new Event();

  constructor(
    private readonly _graph: ComputeGraph,
    private readonly _sheet: SheetType,
    private readonly _space?: Space,
    options: Partial<SheetModelOptions> = {},
  ) {
    // Sheet for this object.
    const name = this._sheet.id;
    if (!this._graph.hf.doesSheetExist(name)) {
      this._graph.hf.addSheet(name);
    }
    this._sheetId = this._graph.hf.getSheetId(name)!;
    this._options = { ...defaultOptions, ...options };
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

  get functions(): FunctionDefinition[] {
    const hfFunctions = this._graph.hf
      .getRegisteredFunctionNames()
      .map((name) => defaultFunctions.find((fn) => fn.name === name) ?? { name });
    const echoFunctions = this._functions.map((fn) => ({ name: fn.binding! }));
    return [...hfFunctions, ...echoFunctions];
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
    this._ctx = new Context();
    if (!this._sheet.rows.length) {
      this._insertIndices(this._sheet.rows, 0, this._options.rows, DEFAULT_ROWS);
    }
    if (!this._sheet.columns.length) {
      this._insertIndices(this._sheet.columns, 0, this._options.columns, DEFAULT_COLUMNS);
    }
    this.reset();

    // Listen for model updates (e.g., async calculations).
    const unsubscribe = this._graph.update.on(() => this.update.emit());
    this._ctx.onDispose(unsubscribe);

    if (this._space) {
      const { Filter } = await import('@dxos/client/echo');
      const { FunctionType } = await import('@dxos/plugin-script/types');

      // Listen for function changes.
      const query = this._space?.db.query(Filter.schema(FunctionType));
      const unsubscribe = query.subscribe(({ objects }) => {
        this._functions = objects.filter((fn) => fn.binding);
        this.update.emit();
      });
      this._ctx.onDispose(unsubscribe);
    }

    return this;
  }

  async destroy() {
    log('destroy', { id: this.id });
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
      const { column, row } = this.addressFromIndex(key);
      if (typeof value === 'string' && value.charAt(0) === '=') {
        value = this.mapFormulaBindingToFormula(this.mapFormulaBindingFromId(this.mapFormulaIndicesToRefs(value)));
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
    this._insertIndices(this._sheet.rows, i, n, DEFAULT_ROWS);
    this.reset();
  }

  insertColumns(i: number, n = 1) {
    this._insertIndices(this._sheet.columns, i, n, DEFAULT_COLUMNS);
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
      const idx = this.addressToIndex(cell);
      delete this._sheet.cells[idx];
    });
  }

  cut(range: CellRange) {
    this._graph.hf.cut(toModelRange(this._sheetId, range));
    this._iterRange(range, (cell) => {
      const idx = this.addressToIndex(cell);
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
          const idx = this.addressToIndex({ row: address.row, column: address.col });
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
    const idx = this.addressToIndex(cell);
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
      return this.mapFormulaBindingFromId(this.mapFormulaIndicesToRefs(value));
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
      this._insertIndices(this._sheet.rows, cell.row, 1, DEFAULT_ROWS);
      refresh = true;
    }
    if (cell.column >= this._sheet.columns.length) {
      this._insertIndices(this._sheet.columns, cell.column, 1, DEFAULT_COLUMNS);
      refresh = true;
    }
    if (refresh) {
      // TODO(burdon): Remove.
      this.reset();
    }

    // Insert into engine.
    this._graph.hf.setCellContents({ sheet: this._sheetId, row: cell.row, col: cell.column }, [
      [typeof value === 'string' && value.charAt(0) === '=' ? this.mapFormulaBindingToFormula(value) : value],
    ]);

    // Insert into sheet.
    const idx = this.addressToIndex(cell);
    if (value === undefined || value === null) {
      delete this._sheet.cells[idx];
    } else {
      if (typeof value === 'string' && value.charAt(0) === '=') {
        value = this.mapFormulaBindingToId(this.mapFormulaRefsToIndices(value));
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

  /**
   *
   */
  // TODO(burdon): Insert indices into sheet.
  private _insertIndices(indices: string[], i: number, n: number, max: number) {
    if (i + n > max) {
      throw new RangeException(i + n);
    }

    const idx = createIndices(n);
    indices.splice(i, 0, ...idx);
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
   * E.g., "A1" => "x1@y1".
   */
  addressToIndex(cell: CellAddress): CellIndex {
    return `${this._sheet.columns[cell.column]}@${this._sheet.rows[cell.row]}`;
  }

  /**
   * E.g., "x1@y1" => "A1".
   */
  addressFromIndex(idx: CellIndex): CellAddress {
    const [column, row] = idx.split('@');
    return {
      column: this._sheet.columns.indexOf(column),
      row: this._sheet.rows.indexOf(row),
    };
  }

  /**
   * E.g., "A1:B2" => "x1@y1:x2@y2".
   */
  rangeToIndex(range: CellRange): string {
    return [range.from, range.to ?? range.from].map((cell) => this.addressToIndex(cell)).join(':');
  }

  /**
   * E.g., "x1@y1:x2@y2" => "A1:B2".
   */
  rangeFromIndex(idx: string): CellRange {
    const [from, to] = idx.split(':').map((idx) => this.addressFromIndex(idx));
    return { from, to };
  }

  /**
   * E.g., "HELLO()" => "EDGE("HELLO")".
   */
  mapFormulaBindingToFormula(formula: string): string {
    return formula.replace(/([a-zA-Z0-9]+)\((.*)\)/g, (match, binding, args) => {
      const fn = this._functions.find((fn) => fn.binding === binding);
      if (!fn) {
        return match;
      }

      if (args.trim() === '') {
        return `EDGE("${binding}")`;
      }
      return `EDGE("${binding}", ${args})`;
    });
  }

  /**
   * E.g., "EDGE("HELLO")" => "HELLO()".
   */
  mapFormulaBindingFromFormula(formula: string): string {
    return formula.replace(/EDGE\("([a-zA-Z0-9]+)"(.*)\)/, (_match, binding, args) => {
      if (args.trim() === '') {
        return `${binding}()`;
      }
      return `${binding}(${args.slice(2)})`;
    });
  }

  /**
   * Map from binding to fully qualified ECHO ID.
   */
  mapFormulaBindingToId(formula: string): string {
    return this._options.mapFormulaBindingToId(this._functions)(formula);
  }

  /**
   * Map from fully qualified ECHO ID to binding.
   */
  mapFormulaBindingFromId(formula: string): string {
    return this._options.mapFormulaBindingFromId(this._functions)(formula);
  }

  /**
   * Map from A1 notation to indices.
   */
  mapFormulaRefsToIndices(formula: string): string {
    invariant(formula.charAt(0) === '=');
    return formula.replace(/([a-zA-Z]+)([0-9]+)/g, (match) => {
      return this.addressToIndex(addressFromA1Notation(match));
    });
  }

  /**
   * Map from indices to A1 notation.
   */
  mapFormulaIndicesToRefs(formula: string): string {
    invariant(formula.charAt(0) === '=');
    return formula.replace(/([a-zA-Z0-9]+)@([a-zA-Z0-9]+)/g, (idx) => {
      return addressToA1Notation(this.addressFromIndex(idx));
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
