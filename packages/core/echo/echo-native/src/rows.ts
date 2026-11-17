//
// Copyright 2026 DXOS.org
//

import { decodeText } from './wire.ts';

/** Bytes per cell: tag (u32), payload length (u32), payload (i64, f64 bits, or heap offset). */
const CELL_SIZE = 16;

const TYPE_NULL = 0;
const TYPE_INT = 1;
const TYPE_FLOAT = 2;
const TYPE_TEXT = 3;
const TYPE_BLOB = 4;

/** A cell value as JS reads it. */
export type CellValue = null | number | string | Uint8Array;

/**
 * A statement's result as Rust laid it out (`Db::query_table`): fixed-size cells addressed by row and
 * column, text and blobs in a heap after them. Nothing is decoded until a cell is read, so a caller that
 * reads two columns of a row pays for two.
 */
export class RowTable {
  readonly columns: readonly string[];
  readonly rows: number;
  readonly #bytes: Uint8Array;
  readonly #view: DataView;
  readonly #cells: number;
  readonly #heap: number;
  readonly #index = new Map<string, number>();

  /** `bytes` must be owned by the table: a copy out of wasm memory, which the next call reuses. */
  constructor(bytes: Uint8Array) {
    this.#bytes = bytes;
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const columnCount = this.#view.getUint32(0, true);
    this.rows = this.#view.getUint32(4, true);
    this.#heap = this.#view.getUint32(8, true);
    let pos = 12;
    const columns: string[] = [];
    for (let index = 0; index < columnCount; index++) {
      const length = this.#view.getUint32(pos, true);
      columns.push(decodeText(bytes, pos + 4, length));
      this.#index.set(columns[index], index);
      pos += 4 + length;
    }
    this.columns = columns;
    this.#cells = pos;
  }

  column(name: string): number {
    return this.#index.get(name) ?? -1;
  }

  get(row: number, column: number): CellValue {
    if (column < 0) {
      return null;
    }
    const at = this.#cells + (row * this.columns.length + column) * CELL_SIZE;
    const type = this.#view.getUint32(at, true);
    switch (type) {
      case TYPE_NULL:
        return null;
      case TYPE_INT: {
        // Two halves rather than `getBigInt64`, which allocates a BigInt per read.
        const low = this.#view.getUint32(at + 8, true);
        const high = this.#view.getInt32(at + 12, true);
        return high * 0x1_0000_0000 + low;
      }
      case TYPE_FLOAT:
        return this.#view.getFloat64(at + 8, true);
      case TYPE_TEXT:
      case TYPE_BLOB: {
        const length = this.#view.getUint32(at + 4, true);
        const offset = this.#heap + this.#view.getUint32(at + 8, true);
        return type === TYPE_TEXT
          ? decodeText(this.#bytes, offset, length)
          : this.#bytes.subarray(offset, offset + length);
      }
      default:
        throw new Error(`unknown cell type ${type}`);
    }
  }

  /** Rows as plain records, for small results whose every column is read anyway. */
  objects(): Record<string, CellValue>[] {
    const out: Record<string, CellValue>[] = [];
    for (let row = 0; row < this.rows; row++) {
      const record: Record<string, CellValue> = {};
      this.columns.forEach((name, column) => {
        record[name] = this.get(row, column);
      });
      out.push(record);
    }
    return out;
  }
}
