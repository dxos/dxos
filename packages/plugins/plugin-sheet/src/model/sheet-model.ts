//
// Copyright 2024 DXOS.org
//

import { type SimpleCellRange } from 'hyperformula/typings/AbsoluteCellRange';
import { type SimpleCellAddress } from 'hyperformula/typings/Cell';
import { type SimpleDate, type SimpleDateTime } from 'hyperformula/typings/DateTimeHelper';

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { getTypename, FormatEnum, TypeEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { DetailedCellError, ExportedCellChange } from '#hyperformula';
import { type ComputeGraph, type ComputeNode, type ComputeNodeEvent, createSheetName } from '../compute-graph';
import {
  addressFromA1Notation,
  addressFromIndex,
  addressToA1Notation,
  addressToIndex,
  initialize,
  insertIndices,
  isFormula,
  type CellAddress,
  type CellRange,
  ReadonlyException,
  MAX_COLUMNS,
  MAX_ROWS,
} from '../defs';
import { type CellScalarValue, type CellValue, type SheetType } from '../types';

// Map sheet types to system types.
// https://hyperformula.handsontable.com/guide/types-of-values.html
//  - https://github.com/handsontable/hyperformula/blob/master/src/Cell.ts (CellValueType)
//  - https://github.com/handsontable/hyperformula/blob/master/src/interpreter/InterpreterValue.ts (NumberType)
const typeMap: Record<string, { type: TypeEnum; format?: FormatEnum }> = {
  BOOLEAN: { type: TypeEnum.Boolean },
  NUMBER_RAW: { type: TypeEnum.Number },
  NUMBER_PERCENT: { type: TypeEnum.Number, format: FormatEnum.Percent },
  NUMBER_CURRENCY: { type: TypeEnum.Number, format: FormatEnum.Currency },
  NUMBER_DATETIME: { type: TypeEnum.String, format: FormatEnum.DateTime },
  NUMBER_DATE: { type: TypeEnum.String, format: FormatEnum.Date },
  NUMBER_TIME: { type: TypeEnum.String, format: FormatEnum.Time },
};

const getTopLeft = (range: CellRange): CellAddress => {
  const to = range.to ?? range.from;
  return { row: Math.min(range.from.row, to.row), col: Math.min(range.from.col, to.col) };
};

const toSimpleCellAddress = (sheet: number, cell: CellAddress): SimpleCellAddress => ({
  sheet,
  row: cell.row,
  col: cell.col,
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
// TODO(burdon): Factor out commonality with ComputeNode. Factor out HF.
export class SheetModel extends Resource {
  public readonly id = `model-${PublicKey.random().truncate()}`;

  // Wraps compute node.
  public readonly update = new Event<ComputeNodeEvent>();

  private _node?: ComputeNode;

  constructor(
    private readonly _graph: ComputeGraph,
    private readonly _sheet: SheetType,
    private readonly _options: SheetModelOptions = {},
  ) {
    super();
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

  /**
   * Initialize sheet and engine.
   */
  protected override async _open() {
    log('initialize', { id: this.id });
    initialize(this._sheet);

    this._graph.update.on((event) => {
      if (event.type === 'functionsUpdated') {
        this.reset();
      }
    });

    // TODO(burdon): SheetModel should extend ComputeNode and be constructed via the graph.
    this._node = this._graph.getOrCreateNode(createSheetName({ type: getTypename(this._sheet)!, id: this._sheet.id }));
    await this._node.open();

    // Listen for model updates (e.g., async calculations).
    const unsubscribe = this._node.update.on((event) => this.update.emit(event));
    this._ctx.onDispose(unsubscribe);

    this.reset();
  }

  /**
   * Update engine.
   * NOTE: This resets the undo history.
   * @deprecated
   */
  reset() {
    invariant(this._node);
    this._node.graph.hf.clearSheet(this._node.sheetId);
    Object.entries(this._sheet.cells).forEach(([key, { value }]) => {
      invariant(this._node);
      const { col, row } = addressFromIndex(this._sheet, key);
      if (isFormula(value)) {
        const binding = this._graph.mapFunctionBindingFromId(this.mapFormulaIndicesToRefs(value));
        if (binding) {
          value = this._graph.mapFormulaToNative(binding);
        } else {
          // If binding is not found, render the cell as empty.
          // This prevents the cell from momentarily rendering an error while the binding is being loaded.
          value = '';
        }
      }

      this._node.graph.hf.setCellContents({ sheet: this._node.sheetId, row, col }, value);
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
    this._node?.graph.hf.rebuildAndRecalculate();
  }

  insertRows(i: number, n = 1) {
    const idx = insertIndices(this._sheet.rows, i, n, MAX_ROWS);
    this.reset();
    return idx;
  }

  insertColumns(i: number, n = 1) {
    const idx = insertIndices(this._sheet.columns, i, n, MAX_COLUMNS);
    this.reset();
    return idx;
  }

  dropRows(idx: string[]) {
    idx.forEach((rowIndex) => {
      this.clear({
        from: addressFromIndex(this._sheet, `${this._sheet.columns[0]}@${rowIndex}`),
        to: addressFromIndex(this._sheet, `${this._sheet.columns[this._sheet.columns.length - 1]}@${rowIndex}`),
      });
      this._sheet.rows.splice(this._sheet.rows.indexOf(rowIndex), 1);
    });
    this.reset();
  }

  dropColumns(idx: string[]) {
    idx.forEach((colIndex) => {
      this.clear({
        from: addressFromIndex(this._sheet, `${colIndex}@${this._sheet.rows[0]}`),
        to: addressFromIndex(this._sheet, `${colIndex}@${this._sheet.rows[this._sheet.rows.length - 1]}`),
      });
      this._sheet.columns.splice(this._sheet.columns.indexOf(colIndex), 1);
    });
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
    invariant(this._node);
    const topLeft = getTopLeft(range);
    const values = this._iterRange(range, () => null);
    this._node.graph.hf.setCellContents(toSimpleCellAddress(this._node.sheetId, topLeft), values);
    this._iterRange(range, (cell) => {
      const idx = addressToIndex(this._sheet, cell);
      delete this._sheet.cells[idx];
    });
  }

  cut(range: CellRange) {
    invariant(this._node);
    this._node.graph.hf.cut(toModelRange(this._node.sheetId, range));
    this._iterRange(range, (cell) => {
      const idx = addressToIndex(this._sheet, cell);
      delete this._sheet.cells[idx];
    });
  }

  copy(range: CellRange) {
    invariant(this._node);
    this._node.graph.hf.copy(toModelRange(this._node.sheetId, range));
  }

  paste(cell: CellAddress) {
    invariant(this._node);
    if (!this._node.graph.hf.isClipboardEmpty()) {
      const changes = this._node.graph.hf.paste(toSimpleCellAddress(this._node.sheetId, cell));
      for (const change of changes) {
        if (change instanceof ExportedCellChange) {
          const { address, newValue } = change;
          const idx = addressToIndex(this._sheet, { row: address.row, col: address.col });
          this._sheet.cells[idx] = { value: newValue };
        }
      }
    }
  }

  // TODO(burdon): Display undo/redo state.
  undo() {
    invariant(this._node);
    if (this._node.graph.hf.isThereSomethingToUndo()) {
      this._node.graph.hf.undo();
      // this.update.emit();
    }
  }

  redo() {
    invariant(this._node);
    if (this._node.graph.hf.isThereSomethingToRedo()) {
      this._node.graph.hf.redo();
      // this.update.emit();
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

    if (isFormula(value)) {
      return this._graph.mapFunctionBindingFromId(this.mapFormulaIndicesToRefs(value));
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
    invariant(this._node);
    const address = toSimpleCellAddress(this._node.sheetId, cell);
    const value = this._node.graph.hf.getCellValue(address);
    if (value instanceof DetailedCellError) {
      // TODO(wittjosiah): Error details should be shown in cell `title`.
      log.info('cell error', { cell, error: value });
      return value.toString();
    }

    return value;
  }

  /**
   * Get value type.
   */
  getValueDescription(cell: CellAddress): { type: TypeEnum; format?: FormatEnum } | undefined {
    invariant(this._node);
    const addr = toSimpleCellAddress(this._node.sheetId, cell);
    const type = this._node.graph.hf.getCellValueDetailedType(addr);
    return typeMap[type];
  }

  /**
   * Sets the value, updating the sheet and engine.
   */
  setValue(cell: CellAddress, value: CellScalarValue) {
    invariant(this._node);
    if (this._options.readonly) {
      throw new ReadonlyException();
    }

    // Reallocate if > current bounds.
    let refresh = false;
    if (cell.row >= this._sheet.rows.length) {
      insertIndices(this._sheet.rows, cell.row, 1, MAX_ROWS);
      refresh = true;
    }
    if (cell.col >= this._sheet.columns.length) {
      insertIndices(this._sheet.columns, cell.col, 1, MAX_COLUMNS);
      refresh = true;
    }

    if (refresh) {
      // TODO(burdon): Remove.
      this.reset();
    }

    // Insert into engine.
    this._node.graph.hf.setCellContents({ sheet: this._node.sheetId, row: cell.row, col: cell.col }, [
      [isFormula(value) ? this._graph.mapFormulaToNative(value) : value],
    ]);

    // Insert into sheet.
    const idx = addressToIndex(this._sheet, cell);
    if (value === undefined || value === null) {
      delete this._sheet.cells[idx];
    } else {
      if (isFormula(value)) {
        value = this._graph.mapFunctionBindingToId(this.mapFormulaRefsToIndices(value));
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
    const columnRange = [Math.min(range.from.col, to.col), Math.max(range.from.col, to.col)];
    const rows: CellScalarValue[][] = [];
    for (let row = rowRange[0]; row <= rowRange[1]; row++) {
      const rowCells: CellScalarValue[] = [];
      for (let column = columnRange[0]; column <= columnRange[1]; column++) {
        const value = cb({ row, col: column });
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
    invariant(isFormula(formula));
    return formula.replace(/([a-zA-Z]+)([0-9]+)/g, (match) => {
      return addressToIndex(this._sheet, addressFromA1Notation(match));
    });
  }

  /**
   * Map from indices to A1 notation.
   */
  mapFormulaIndicesToRefs(formula: string): string {
    invariant(isFormula(formula));
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
    invariant(this._node);
    return this._node.graph.hf.numberToDateTime(num) as SimpleDateTime;
  }

  toDate(num: number): SimpleDate {
    invariant(this._node);
    return this._node.graph.hf.numberToDate(num) as SimpleDate;
  }

  toTime(num: number): SimpleDate {
    invariant(this._node);
    return this._node.graph.hf.numberToTime(num) as SimpleDate;
  }
}
