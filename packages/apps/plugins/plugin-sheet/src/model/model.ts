//
// Copyright 2024 DXOS.org
//

import { DetailedCellError, ExportedCellChange, HyperFormula } from 'hyperformula';
import { type SimpleCellRange } from 'hyperformula/typings/AbsoluteCellRange';
import { type SimpleCellAddress } from 'hyperformula/typings/Cell';
import { type SimpleDate, type SimpleDateTime } from 'hyperformula/typings/DateTimeHelper';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';

import { CustomPlugin, CustomPluginTranslations, ModelContext } from './custom';
import { addressFromA1Notation, addressToA1Notation, type CellAddress, type CellRange } from './types';
import { createIndices, RangeException, ReadonlyException } from './util';
import { type CellScalar, type CellValue, type SheetType, ValueFormatEnum } from '../types';

const MAX_ROWS = 500;
const MAX_COLUMNS = 52;

export type CellIndex = string;

export type CellContentValue = number | string | boolean | null;

export type SheetModelOptions = {
  readonly?: boolean;
  rows: number;
  columns: number;
};

const typeMap: Record<string, ValueFormatEnum> = {
  NUMBER_RAW: ValueFormatEnum.Number,
  NUMBER_PERCENT: ValueFormatEnum.Percent,
  NUMBER_CURRENCY: ValueFormatEnum.Currency,
  NUMBER_DATETIME: ValueFormatEnum.DateTime,
  NUMBER_DATE: ValueFormatEnum.Date,
  NUMBER_TIME: ValueFormatEnum.Time,

  BOOLEAN: ValueFormatEnum.Boolean,
};

export const defaultOptions: SheetModelOptions = {
  rows: 50,
  columns: 26,
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
 */
export class SheetModel {
  private readonly _ctx = new Context();

  /**
   * Formula engine.
   * Acts as a write through cache for scalar and computed values.
   */
  private readonly _hf: HyperFormula;
  private readonly _sheetId: number;
  private readonly _options: SheetModelOptions;

  private readonly _context = new ModelContext(() => {
    this._hf.rebuildAndRecalculate();
    this.update.emit();
  });

  public readonly update = new Event();

  constructor(
    private readonly _sheet: SheetType,
    options: Partial<SheetModelOptions> = {},
  ) {
    // TODO(burdon): Registration?
    HyperFormula.registerFunctionPlugin(CustomPlugin, CustomPluginTranslations);

    this._hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3', context: this._context });
    this._sheetId = this._hf.getSheetId(this._hf.addSheet())!;
    this._options = { ...defaultOptions, ...options };
    this.reset();
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

  get sheet() {
    return this._sheet;
  }

  get functions(): string[] {
    return this._hf.getRegisteredFunctionNames();
  }

  /**
   * Initialize sheet and engine.
   */
  initialize() {
    if (!this._sheet.rows.length) {
      this._insertIndices(this._sheet.rows, 0, this._options.rows, MAX_ROWS);
    }
    if (!this._sheet.columns.length) {
      this._insertIndices(this._sheet.columns, 0, this._options.columns, MAX_COLUMNS);
    }
    this.reset();
    return this;
  }

  async destroy() {
    return this._ctx.dispose();
  }

  insertRows(i: number, n = 1) {
    this._insertIndices(this._sheet.rows, i, n, MAX_ROWS);
    this.reset();
  }

  insertColumns(i: number, n = 1) {
    this._insertIndices(this._sheet.columns, i, n, MAX_COLUMNS);
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
    this._hf.setCellContents(toSimpleCellAddress(this._sheetId, topLeft), values);
    this._iterRange(range, (cell) => {
      const idx = this.getCellIndex(cell);
      delete this._sheet.cells[idx];
    });
  }

  cut(range: CellRange) {
    this._hf.cut(toModelRange(this._sheetId, range));
    this._iterRange(range, (cell) => {
      const idx = this.getCellIndex(cell);
      delete this._sheet.cells[idx];
    });
  }

  copy(range: CellRange) {
    this._hf.copy(toModelRange(this._sheetId, range));
  }

  paste(cell: CellAddress) {
    if (!this._hf.isClipboardEmpty()) {
      const changes = this._hf.paste(toSimpleCellAddress(this._sheetId, cell));
      for (const change of changes) {
        if (change instanceof ExportedCellChange) {
          const { address, newValue } = change;
          const idx = this.getCellIndex({ row: address.row, column: address.col });
          this._sheet.cells[idx] = { value: newValue };
        }
      }
    }
  }

  // TODO(burdon): Display undo/redo state.
  undo() {
    if (this._hf.isThereSomethingToUndo()) {
      this._hf.undo();
      this.update.emit();
    }
  }

  redo() {
    if (this._hf.isThereSomethingToRedo()) {
      this._hf.redo();
      this.update.emit();
    }
  }

  /**
   * Get value from sheet.
   */
  getCellValue(cell: CellAddress): CellScalar {
    const idx = this.getCellIndex(cell);
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
      return this.mapFormulaIndicesToRefs(value);
    } else {
      return String(value);
    }
  }

  /**
   * Get array of raw values from sheet.
   */
  getCellValues(range: CellRange): CellScalar[][] {
    return this._iterRange(range, (cell) => this.getCellValue(cell));
  }

  /**
   * Gets the regular or computed value from the engine.
   */
  getValue(cell: CellAddress): CellScalar {
    const value = this._hf.getCellValue(toSimpleCellAddress(this._sheetId, cell));
    if (value instanceof DetailedCellError) {
      return value.toString();
    }

    return value;
  }

  /**
   * Get value type.
   */
  getValueType(cell: CellAddress): ValueFormatEnum | undefined {
    const type = this._hf.getCellValueDetailedType(toSimpleCellAddress(this._sheetId, cell));
    return typeMap[type];
  }

  /**
   * Sets the value, updating the sheet and engine.
   */
  setValue(cell: CellAddress, value: CellScalar) {
    if (this._options.readonly) {
      throw new ReadonlyException();
    }

    // Reallocate if > current bounds.
    let refresh = false;
    if (cell.row >= this._sheet.rows.length) {
      this._insertIndices(this._sheet.rows, cell.row, 1, MAX_ROWS);
      refresh = true;
    }
    if (cell.column >= this._sheet.columns.length) {
      this._insertIndices(this._sheet.columns, cell.column, 1, MAX_COLUMNS);
      refresh = true;
    }
    if (refresh) {
      // TODO(burdon): Remove.
      this.reset();
    }

    // Insert into engine.
    this._hf.setCellContents({ sheet: this._sheetId, row: cell.row, col: cell.column }, [[value]]);

    // Insert into sheet.
    const idx = this.getCellIndex(cell);
    if (value === undefined || value === null) {
      delete this._sheet.cells[idx];
    } else {
      if (typeof value === 'string' && value.charAt(0) === '=') {
        value = this.mapFormulaRefsToIndices(value);
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
   * Get the fractional index of the cell.
   */
  getCellIndex(cell: CellAddress): CellIndex {
    return `${this._sheet.columns[cell.column]}@${this._sheet.rows[cell.row]}`;
  }

  /**
   * Get the cell position from the fractional index.
   */
  getCellPosition(idx: CellIndex): CellAddress {
    const [column, row] = idx.split('@');
    return {
      column: this._sheet.columns.indexOf(column),
      row: this._sheet.rows.indexOf(row),
    };
  }

  /**
   * Iterate range.
   */
  private _iterRange(range: CellRange, cb: (cell: CellAddress) => CellScalar | void): CellScalar[][] {
    const to = range.to ?? range.from;
    const rowRange = [Math.min(range.from.row, to.row), Math.max(range.from.row, to.row)];
    const columnRange = [Math.min(range.from.column, to.column), Math.max(range.from.column, to.column)];
    const rows: CellScalar[][] = [];
    for (let row = rowRange[0]; row <= rowRange[1]; row++) {
      const rowCells: CellScalar[] = [];
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

  /**
   *
   */
  // TODO(burdon): Delete index.
  private _deleteIndices(indices: string[], i: number, n: number) {
    throw new Error('Not implemented');
  }

  // TODO(burdon): Move. Cannot use fractional without changing. Switch back to using unique IDs?
  private _moveIndices(indices: string[], i: number, j: number, n: number) {
    throw new Error('Not implemented');
  }

  /**
   * Recalculate formulas.
   * https://hyperformula.handsontable.com/guide/volatile-functions.html#volatile-actions
   */
  recalculate() {
    this._hf.rebuildAndRecalculate();
  }

  /**
   * Update engine.
   * NOTE: This will interfere with the undo stack.
   * @deprecated
   */
  reset() {
    this._hf.clearSheet(this._sheetId);
    Object.entries(this._sheet.cells).forEach(([key, { value }]) => {
      const { column, row } = this.getCellPosition(key);
      if (typeof value === 'string' && value.charAt(0) === '=') {
        value = this.mapFormulaIndicesToRefs(value);
      }

      this._hf.setCellContents({ sheet: this._sheetId, row, col: column }, value);
    });
  }

  /**
   * Map from A1 notation to indices.
   */
  mapFormulaRefsToIndices(formula: string): string {
    invariant(formula.charAt(0) === '=');
    return formula.replace(/([a-zA-Z]+)([0-9]+)/g, (match) => {
      return this.getCellIndex(addressFromA1Notation(match));
    });
  }

  /**
   * Map from indices to A1 notation.
   */
  mapFormulaIndicesToRefs(formula: string): string {
    invariant(formula.charAt(0) === '=');
    return formula.replace(/([a-zA-Z0-9]+)@([a-zA-Z0-9]+)/g, (match) => {
      return addressToA1Notation(this.getCellPosition(match));
    });
  }

  toDateTime(num: number): SimpleDateTime {
    return this._hf.numberToDateTime(num) as SimpleDateTime;
  }

  toDate(num: number): SimpleDate {
    return this._hf.numberToDate(num) as SimpleDate;
  }

  toTime(num: number): SimpleDate {
    return this._hf.numberToTime(num) as SimpleDate;
  }

  /**
   * https://hyperformula.handsontable.com/guide/date-and-time-handling.html#example
   * NOTE: TODAY() is number of FULL days since nullDate. It will typically be -1 days from NOW().
   */
  toLocalDate(num: number): Date {
    const { year, month, day, hours, minutes, seconds } = this.toDateTime(num);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }
}
