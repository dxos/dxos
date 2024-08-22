//
// Copyright 2024 DXOS.org
//

import { DetailedCellError, HyperFormula } from 'hyperformula';
import { type ExportedChange } from 'hyperformula/typings/Exporter';

import { debounce, Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';

import { CustomPlugin, CustomPluginTranslations, ModelContext } from './custom';
import { cellFromA1Notation, type CellPosition, type CellRange, cellToA1Notation } from './types';
import { createIndices, RangeException, ReadonlyException } from './util';
import { type CellScalar, type CellValue, type SheetType } from '../types';

const MAX_ROWS = 500;
const MAX_COLUMNS = 52;

export type CellIndex = string;

export type CellContentValue = number | string | boolean | null;

export type SheetModelOptions = {
  readonly?: boolean;
  rows: number;
  columns: number;
};

export const defaultOptions: SheetModelOptions = {
  rows: 50,
  columns: 26,
};

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
    console.log('### SheetModel constructor');

    // TODO(burdon): Static registration?
    HyperFormula.registerFunctionPlugin(CustomPlugin, CustomPluginTranslations);

    this._hf = HyperFormula.buildEmpty({ context: this._context, licenseKey: 'gpl-v3' });
    this._sheetId = this._hf.getSheetId(this._hf.addSheet())!;
    this._options = { ...defaultOptions, ...options };
    this.refresh();

    // Update (e.g., after custom async function).
    const onUpdate = debounce((_changes: ExportedChange[]) => {
      this.update.emit();
    }, 100);

    // Listen for updates.
    this._hf.on('valuesUpdated', onUpdate);
    this._ctx.onDispose(() => {
      this._hf.off('valuesUpdated', onUpdate);
    });
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
    this.refresh();
    return this;
  }

  async destroy() {
    return this._ctx.dispose();
  }

  insertRows(i: number, n = 1) {
    this._insertIndices(this._sheet.rows, i, n, MAX_ROWS);
    this.refresh();
  }

  insertColumns(i: number, n = 1) {
    this._insertIndices(this._sheet.columns, i, n, MAX_COLUMNS);
    this.refresh();
  }

  /**
   * Get value from sheet.
   */
  getCellValue(cell: CellPosition): CellScalar {
    const idx = this.getCellIndex(cell);
    return this._sheet.cells[idx]?.value ?? null;
  }

  /**
   * Get value as a string for editing.
   */
  getCellText(cell: CellPosition): string | undefined {
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
  getCellValues({ from, to }: CellRange): CellScalar[][] {
    const rowRange = [Math.min(from.row, to!.row), Math.max(from.row, to!.row)];
    const columnRange = [Math.min(from.column, to!.column), Math.max(from.column, to!.column)];
    const rows: CellScalar[][] = [];
    for (let row = rowRange[0]; row <= rowRange[1]; row++) {
      const rowCells: CellScalar[] = [];
      for (let column = columnRange[0]; column <= columnRange[1]; column++) {
        rowCells.push(this.getCellValue({ row, column }));
      }
      rows.push(rowCells);
    }
    return rows;
  }

  /**
   * Gets the regular or computed value from the engine.
   */
  getValue(cell: CellPosition): CellScalar {
    const value = this._hf.getCellValue({ sheet: this._sheetId, row: cell.row, col: cell.column });
    if (value instanceof DetailedCellError) {
      // TODO(burdon): Format error.
      return value.toString();
    }

    return value;
  }

  /**
   * Sets the value, updating the sheet and engine.
   */
  setValue(cell: CellPosition, value: CellScalar) {
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
      this.refresh();
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
      this.setValue(cellFromA1Notation(key), value);
    });
  }

  /**
   * Clear range of values.
   */
  clearRange(range: CellRange) {
    const rowRange = [Math.min(range.from.row, range.to!.row), Math.max(range.from.row, range.to!.row)];
    const columnRange = [Math.min(range.from.column, range.to!.column), Math.max(range.from.column, range.to!.column)];
    for (let row = rowRange[0]; row <= rowRange[1]; row++) {
      for (let column = columnRange[0]; column <= columnRange[1]; column++) {
        this.setValue({ row, column }, null);
      }
    }
  }

  /**
   * Get the fractional index of the cell.
   */
  getCellIndex(cell: CellPosition): CellIndex {
    return `${this._sheet.columns[cell.column]}@${this._sheet.rows[cell.row]}`;
  }

  /**
   * Get the cell position from the fractional index.
   */
  getCellPosition(idx: CellIndex): CellPosition {
    const [column, row] = idx.split('@');
    return {
      column: this._sheet.columns.indexOf(column),
      row: this._sheet.rows.indexOf(row),
    };
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
   */
  refresh() {
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
    return formula.replace(A1NotationRegExp, (match) => {
      return this.getCellIndex(cellFromA1Notation(match));
    });
  }

  /**
   * Map from indices to A1 notation.
   */
  mapFormulaIndicesToRefs(formula: string): string {
    invariant(formula.charAt(0) === '=');
    return formula.replace(/([a-zA-Z0-9]+)@([a-zA-Z0-9]+)/g, (match) => {
      return cellToA1Notation(this.getCellPosition(match));
    });
  }
}

export const A1NotationRegExp = /([a-zA-Z]+)([0-9]+)/g;
