//
// Copyright 2024 DXOS.org
//

import { getIndicesAbove, getIndicesBelow, getIndicesBetween } from '@tldraw/indices';
import { RuntimeException } from 'effect/Cause';
import { DetailedCellError, HyperFormula } from 'hyperformula';
import { type NoErrorCellValue } from 'hyperformula/typings/CellValue';

import { type CellPosition } from './types';
import { type SheetType } from '../types';

// TODO(burdon): Move types here.

const RANDOM = 10;

const MAX_ROWS = 100;
const MAX_COLUMNS = 26;

// TODO(burdon): Errors.
export const ReadonlyException: new (message?: string | undefined) => RuntimeException = RuntimeException;
export const RangeException: new (message?: string | undefined) => RuntimeException = RuntimeException;

// TODO(burdon): Factor out.
const pickOne = <T>(values: T[]): T => values[Math.floor(Math.random() * values.length)];
const pickSome = <T>(values: T[], n = 1): T[] => {
  const result = new Set<T>();
  while (result.size < n) {
    result.add(pickOne(values));
  }
  return Array.from(result.values());
};

// TODO(burdon): Regex effect type.
export type Value = NoErrorCellValue;

/**
 * 2D fractional index.
 */
export type CellIndex = string;

export type ModelOptions = {
  readonly?: boolean;
  rows: number;
  columns: number;
};

export const defaultOptions: ModelOptions = {
  rows: 50,
  columns: 26,
};

// TODO(burdon): Set row/column props (size, formatting in separate model).

/**
 * Spreadsheet model.
 */
export class Model {
  /**
   * Formula engine.
   * Acts as a write through cache for scalar and computed values.
   */
  private readonly _hf: HyperFormula;
  private readonly _sheetId: number;

  // Sorted fractional indices.
  private readonly _rows: string[] = [];
  private readonly _columns: string[] = [];

  constructor(
    private readonly _sheet: SheetType,
    private readonly _options: ModelOptions = defaultOptions,
  ) {
    this._hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
    this._sheetId = this._hf.getSheetId(this._hf.addSheet())!;
    this._refresh();
  }

  get info() {
    return {
      rows: this._rows.length,
      columns: this._columns.length,
    };
  }

  initialize() {}

  insertRows(i: number, n = 1) {
    this._insertIndices(this._rows, i, n, MAX_ROWS);
    this._refresh();
  }

  insertColumns(i: number, n = 1) {
    this._insertIndices(this._columns, i, n, MAX_COLUMNS);
    this._refresh();
  }

  /**
   *
   */
  // TODO(burdon): Insert indices into sheet.
  private _insertIndices(indices: string[], i: number, n: number, max: number) {
    if (i + n > max) {
      throw new RangeException();
    }

    if (i === 0) {
      const idx = pickSome(getIndicesBelow(indices[0], n * RANDOM), n);
      indices.splice(0, 0, ...idx);
    } else if (i >= indices.length) {
      // Reallocate if > current bounds.
      // TODO(burdon): Is this OK if this happens concurrently?
      indices.splice(indices.length, 0, ...getIndicesAbove(indices[indices.length - 1], i + n - indices.length));
    } else {
      const idx = pickSome(getIndicesBetween(indices[i - 1], indices[i], n * RANDOM), n);
      indices.splice(i, 0, ...idx);
    }
  }

  /**
   *
   */
  // TODO(burdon): Delete index.
  private _deleteIndices(indices: string[], i: number, n: number) {
    throw new Error('Not implemented');
  }

  /**
   * Update engine.
   */
  private _refresh() {
    this._hf.clearSheet(this._sheetId);
    Object.entries(this._sheet.cells).forEach(([key, { value }]) => {
      const { column, row } = this.getCellPosition(key);
      this._hf.setCellContents({ sheet: this._sheetId, row, col: column }, value);
    });
  }

  /**
   * Gets the regular or computed value.
   */
  getValue(cell: CellPosition): Value {
    const value = this._hf.getCellValue({ sheet: this._sheetId, row: cell.row, col: cell.column });
    if (value instanceof DetailedCellError) {
      // TODO(burdon): Format error.
      return value.toString();
    }

    return value;
  }

  /**
   * Gets the editable value.
   */
  getEditableValue(cell: CellPosition): string | undefined {
    const formula = this._hf.getCellFormula({ sheet: this._sheetId, row: cell.row, col: cell.column });
    const value = formula ?? this.getValue(cell);
    return value?.toString();
  }

  /**
   * Sets the value, updating the sheet and engine.
   */
  setValue(cell: CellPosition, value: Value) {
    if (this._options.readonly) {
      throw new ReadonlyException();
    }

    // Reallocate if > current bounds.
    if (cell.row >= this._rows.length) {
      this._insertIndices(this._rows, cell.row, 1, MAX_ROWS);
    }
    if (cell.column >= this._columns.length) {
      this._insertIndices(this._columns, cell.column, 1, MAX_COLUMNS);
    }

    // Insert into engine.
    this._hf.setCellContents({ sheet: this._sheetId, row: cell.row, col: cell.column }, [[value]]);

    // Insert into sheet.
    const idx = this.getIndex(cell);
    if (value === undefined) {
      delete this._sheet.cells[idx];
    } else {
      this._sheet.cells[idx] = { value };
    }
  }

  /**
   * Get the fractional index of the cell.
   */
  getIndex(cell: CellPosition): CellIndex {
    return `${this._columns[cell.column]}@${this._rows[cell.row]}`;
  }

  /**
   * Get the cell position from the fractional index.
   */
  getCellPosition(idx: CellIndex): CellPosition {
    const [column, row] = idx.split('@');
    return {
      column: this._columns.indexOf(column),
      row: this._rows.indexOf(row),
    };
  }
}
