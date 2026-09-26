//
// Copyright 2026 DXOS.org
//

// Reads Automerge's binary formats without Automerge: a saved document (a document chunk) and change
// chunks. Columns must be uncompressed: the host sends `saveNoCompress()` bytes and uncompressed
// changes, so the tab needs no DEFLATE.

import { sha256 } from '@noble/hashes/sha2';

const ACTIONS = ['makeMap', 'set', 'makeList', 'del', 'makeText', 'inc'];

const decoder = new TextDecoder();

class Cursor {
  readonly bytes: Uint8Array;
  offset: number;
  readonly end: number;

  constructor(bytes: Uint8Array, offset = 0, end = bytes.length) {
    this.bytes = bytes;
    this.offset = offset;
    this.end = end;
  }

  done(): boolean {
    return this.offset >= this.end;
  }

  byte(): number {
    return this.bytes[this.offset++];
  }

  uleb(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = this.bytes[this.offset++];
      result += (byte & 0x7f) * 2 ** shift;
      shift += 7;
    } while (byte & 0x80);
    return result;
  }

  leb(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = this.bytes[this.offset++];
      result += (byte & 0x7f) * 2 ** shift;
      shift += 7;
    } while (byte & 0x80);
    if (byte & 0x40) {
      result -= 2 ** shift;
    }
    return result;
  }

  take(length: number): Uint8Array {
    const out = this.bytes.subarray(this.offset, this.offset + length);
    this.offset += length;
    return out;
  }
}

type Reader<T> = (cursor: Cursor) => T;

function* rle<T>(cursor: Cursor, read: Reader<T>): Generator<T | null> {
  while (!cursor.done()) {
    const length = cursor.leb();
    if (length > 0) {
      const value = read(cursor);
      for (let i = 0; i < length; i++) {
        yield value;
      }
    } else if (length === 0) {
      const nulls = cursor.uleb();
      for (let i = 0; i < nulls; i++) {
        yield null;
      }
    } else {
      for (let i = 0; i < -length; i++) {
        yield read(cursor);
      }
    }
  }
}

function* delta(cursor: Cursor): Generator<number | null> {
  let sum = 0;
  for (const step of rle(cursor, (c) => c.leb())) {
    if (step === null) {
      yield null;
    } else {
      sum += step;
      yield sum;
    }
  }
}

function* booleans(cursor: Cursor): Generator<boolean> {
  let value = false;
  while (!cursor.done()) {
    const count = cursor.uleb();
    for (let i = 0; i < count; i++) {
      yield value;
    }
    value = !value;
  }
}

type Columns = Map<number, Uint8Array>;

const readColumns = (cursor: Cursor): { spec: number; length: number }[] => {
  const count = cursor.uleb();
  const specs = [];
  for (let i = 0; i < count; i++) {
    specs.push({ spec: cursor.uleb(), length: cursor.uleb() });
  }
  return specs;
};

const sliceColumns = (cursor: Cursor, specs: { spec: number; length: number }[]): Columns => {
  const columns: Columns = new Map();
  for (const { spec, length } of specs) {
    if ((spec >> 3) & 1) {
      throw new Error('Compressed columns are not supported; save with saveNoCompress');
    }
    columns.set(spec, cursor.take(length));
  }
  return columns;
};

/**
 * Opens a column by id, typed by how it is encoded: integers (run-length uleb for actors, group
 * counts and value metadata; delta for counters), strings, or booleans. An absent column reads as nulls.
 */
const opener = (columns: Columns) => {
  const cursorFor = (id: number, type: number) => {
    const bytes = columns.get((id << 4) | type);
    return bytes ? new Cursor(bytes) : undefined;
  };
  return {
    integers: (id: number, type: 0 | 1 | 2 | 3 | 6): Generator<number | null> | undefined => {
      const cursor = cursorFor(id, type);
      return cursor ? (type === 3 ? delta(cursor) : rle(cursor, (c) => c.uleb())) : undefined;
    },
    strings: (id: number): Generator<string | null> | undefined => {
      const cursor = cursorFor(id, 5);
      return cursor ? rle(cursor, (c) => decoder.decode(c.take(c.uleb()))) : undefined;
    },
    booleans: (id: number): Generator<boolean> | undefined => {
      const cursor = cursorFor(id, 4);
      return cursor ? booleans(cursor) : undefined;
    },
  };
};

const next = <T>(iterator: Iterator<T | null> | undefined): T | null => {
  const result = iterator?.next();
  return result === undefined || result.done ? null : result.value;
};

/** A value every row of the column has. */
const must = <T>(value: T | null, column: string): T => {
  if (value === null) {
    throw new Error(`Missing ${column}`);
  }
  return value;
};

const hex = (bytes: Uint8Array): string => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/** The datatypes `A.decodeChange` names; a string, bytes, a boolean or null carries none. */
const DATATYPES: Record<number, string> = { 3: 'uint', 4: 'int', 5: 'float64', 8: 'counter', 9: 'timestamp' };

/** A value from its metadata (length and type code) and the raw value column. */
const readValue = (meta: number, raw: Cursor | undefined): { value: unknown; datatype?: string } => {
  const length = Math.floor(meta / 16);
  const valueType = meta & 0xf;
  if (!raw || length === 0) {
    return { value: valueType === 6 ? '' : valueType === 1 ? false : valueType === 2 ? true : null };
  }
  const value = raw.take(length);
  const datatype = DATATYPES[valueType];
  if (valueType === 6) {
    return { value: decoder.decode(value), datatype };
  }
  if (valueType === 3) {
    return { value: new Cursor(value).uleb(), datatype };
  }
  if (valueType === 4 || valueType === 8 || valueType === 9) {
    return { value: new Cursor(value).leb(), datatype };
  }
  if (valueType === 5) {
    return { value: new DataView(value.buffer, value.byteOffset, 8).getFloat64(0, true), datatype };
  }
  return { value: value.slice(), datatype };
};

/** Opens a chunk: checks the magic bytes and the checksum, and returns its type, hash and end. */
const openChunk = (cursor: Cursor): { type: number; hash: Uint8Array; end: number } => {
  const magic = cursor.take(4);
  if (magic[0] !== 0x85 || magic[1] !== 0x6f || magic[2] !== 0x4a || magic[3] !== 0x83) {
    throw new Error('Not an Automerge chunk');
  }
  const checksum = cursor.take(4);
  const hashedFrom = cursor.offset;
  const type = cursor.byte();
  const length = cursor.uleb();
  const end = cursor.offset + length;
  const hash = sha256(cursor.bytes.subarray(hashedFrom, end));
  if (hash.subarray(0, 4).some((byte, index) => byte !== checksum[index])) {
    throw new Error('Chunk checksum does not match');
  }
  return { type, hash, end };
};

/** A saved document's ops, column by column: op `i`'s fields are entry `i` of each array; a null actor is -1. */
export type SavedOps = {
  count: number;
  idActor: Int32Array;
  idCounter: Uint32Array;
  objActor: Int32Array;
  objCounter: Uint32Array;
  keyActor: Int32Array;
  keyCounter: Uint32Array;
  /** An index into `strings`, or -1 for an op that names an element. */
  keyString: Int32Array;
  insert: Uint8Array;
  action: Uint8Array;
  /** Each value's length times 16 plus its type code; the values follow one another in `raw`. */
  valueMeta: Uint32Array;
  raw: Uint8Array;
  succCount: Uint32Array;
  /** Every op's successors back to back, `succCount[i]` of them for op `i`. */
  succActor: Int32Array;
  succCounter: Uint32Array;
};

/** A saved document's change metadata, column by column. */
export type SavedChanges = {
  count: number;
  actor: Int32Array;
  seq: Uint32Array;
  maxOp: Uint32Array;
  time: Float64Array;
  message: (string | null)[];
  depCount: Uint32Array;
  /** Every change's dependencies back to back, as indexes of earlier changes. */
  deps: Int32Array;
};

export type SavedColumns = {
  actors: string[];
  heads: string[];
  strings: string[];
  ops: SavedOps;
  changes: SavedChanges;
};

/** A run-length column of unsigned integers, nulls as -1. */
const rleValues = (bytes: Uint8Array | undefined): number[] => {
  const out: number[] = [];
  if (!bytes) {
    return out;
  }
  const cursor = new Cursor(bytes);
  while (!cursor.done()) {
    const length = cursor.leb();
    if (length > 0) {
      const value = cursor.uleb();
      for (let i = 0; i < length; i++) {
        out.push(value);
      }
    } else if (length === 0) {
      for (let nulls = cursor.uleb(); nulls > 0; nulls--) {
        out.push(-1);
      }
    } else {
      for (let i = 0; i < -length; i++) {
        out.push(cursor.uleb());
      }
    }
  }
  return out;
};

/** Fills `out` from a run-length column of unsigned integers; nulls, and entries past the column's end, become `none`. */
const fillRle = (bytes: Uint8Array | undefined, out: Int32Array | Uint32Array | Uint8Array, none: number): void => {
  let index = 0;
  if (bytes) {
    const cursor = new Cursor(bytes);
    while (!cursor.done()) {
      const length = cursor.leb();
      if (length > 0) {
        out.fill(cursor.uleb(), index, index + length);
        index += length;
      } else if (length === 0) {
        const nulls = cursor.uleb();
        out.fill(none, index, index + nulls);
        index += nulls;
      } else {
        for (let i = 0; i < -length; i++) {
          out[index++] = cursor.uleb();
        }
      }
    }
  }
  out.fill(none, index);
};

/** Fills `out` from a delta column; a null leaves the running sum alone and reads as `none`. */
const fillDelta = (bytes: Uint8Array | undefined, out: Uint32Array | Float64Array, none: number): void => {
  let index = 0;
  let sum = 0;
  if (bytes) {
    const cursor = new Cursor(bytes);
    while (!cursor.done()) {
      const length = cursor.leb();
      if (length > 0) {
        const step = cursor.leb();
        for (let i = 0; i < length; i++) {
          sum += step;
          out[index++] = sum;
        }
      } else if (length === 0) {
        const nulls = cursor.uleb();
        out.fill(none, index, index + nulls);
        index += nulls;
      } else {
        for (let i = 0; i < -length; i++) {
          sum += cursor.leb();
          out[index++] = sum;
        }
      }
    }
  }
  out.fill(none, index);
};

/** Fills `out` from a boolean column: alternating runs, starting with false. */
const fillBooleans = (bytes: Uint8Array | undefined, out: Uint8Array): void => {
  let index = 0;
  let value = 0;
  if (bytes) {
    const cursor = new Cursor(bytes);
    while (!cursor.done()) {
      const count = cursor.uleb();
      out.fill(value, index, index + count);
      index += count;
      value = 1 - value;
    }
  }
  out.fill(0, index);
};

/** Reads a run-length column of strings through `each`, which gets the string or null. */
const readStrings = (
  bytes: Uint8Array | undefined,
  count: number,
  each: (index: number, value: string | null) => void,
): void => {
  let index = 0;
  if (bytes) {
    const cursor = new Cursor(bytes);
    while (!cursor.done()) {
      const length = cursor.leb();
      if (length > 0) {
        const value = decoder.decode(cursor.take(cursor.uleb()));
        for (let i = 0; i < length; i++) {
          each(index++, value);
        }
      } else if (length === 0) {
        for (let nulls = cursor.uleb(); nulls > 0; nulls--) {
          each(index++, null);
        }
      } else {
        for (let i = 0; i < -length; i++) {
          each(index++, decoder.decode(cursor.take(cursor.uleb())));
        }
      }
    }
  }
  while (index < count) {
    each(index++, null);
  }
};

const sum = (values: Uint32Array): number => values.reduce((total, value) => total + value, 0);

/**
 * A saved document (a document chunk) decoded column by column into typed arrays: no object per op,
 * which is what makes loading a long history quick.
 */
export const readSavedColumns = (bytes: Uint8Array): SavedColumns => {
  const cursor = new Cursor(bytes);
  const { type } = openChunk(cursor);
  if (type !== 0) {
    throw new Error(`Expected a document chunk, got type ${type}`);
  }
  const actors: string[] = [];
  for (let count = cursor.uleb(); count > 0; count--) {
    actors.push(hex(cursor.take(cursor.uleb())));
  }
  const heads: string[] = [];
  for (let count = cursor.uleb(); count > 0; count--) {
    heads.push(hex(cursor.take(32)));
  }
  const changeSpecs = readColumns(cursor);
  const opSpecs = readColumns(cursor);
  const changeColumns = sliceColumns(cursor, changeSpecs);
  const opColumns = sliceColumns(cursor, opSpecs);
  const column = (columns: Columns, id: number, kind: number) => columns.get((id << 4) | kind);

  const changeActor = rleValues(column(changeColumns, 0, 1));
  const changeCount = changeActor.length;
  const changes: SavedChanges = {
    count: changeCount,
    actor: Int32Array.from(changeActor),
    seq: new Uint32Array(changeCount),
    maxOp: new Uint32Array(changeCount),
    time: new Float64Array(changeCount),
    message: new Array<string | null>(changeCount).fill(null),
    depCount: new Uint32Array(changeCount),
    deps: new Int32Array(0),
  };
  fillDelta(column(changeColumns, 0, 3), changes.seq, 0);
  fillDelta(column(changeColumns, 1, 3), changes.maxOp, 0);
  fillDelta(column(changeColumns, 2, 3), changes.time, 0);
  readStrings(column(changeColumns, 3, 5), changeCount, (index, value) => {
    changes.message[index] = value;
  });
  fillRle(column(changeColumns, 4, 0), changes.depCount, 0);
  const depIndexes = new Uint32Array(sum(changes.depCount));
  fillDelta(column(changeColumns, 4, 3), depIndexes, 0);
  changes.deps = Int32Array.from(depIndexes);

  const idActor = rleValues(column(opColumns, 2, 1));
  const count = idActor.length;
  const strings: string[] = [];
  const stringIndex = new Map<string, number>();
  const ops: SavedOps = {
    count,
    idActor: Int32Array.from(idActor),
    idCounter: new Uint32Array(count),
    objActor: new Int32Array(count),
    objCounter: new Uint32Array(count),
    keyActor: new Int32Array(count),
    keyCounter: new Uint32Array(count),
    keyString: new Int32Array(count),
    insert: new Uint8Array(count),
    action: new Uint8Array(count),
    valueMeta: new Uint32Array(count),
    raw: column(opColumns, 5, 7) ?? new Uint8Array(0),
    succCount: new Uint32Array(count),
    succActor: new Int32Array(0),
    succCounter: new Uint32Array(0),
  };
  fillDelta(column(opColumns, 2, 3), ops.idCounter, 0);
  fillRle(column(opColumns, 0, 1), ops.objActor, -1);
  fillRle(column(opColumns, 0, 2), ops.objCounter, 0);
  fillRle(column(opColumns, 1, 1), ops.keyActor, -1);
  fillDelta(column(opColumns, 1, 3), ops.keyCounter, 0);
  readStrings(column(opColumns, 1, 5), count, (index, value) => {
    if (value === null) {
      ops.keyString[index] = -1;
      return;
    }
    let interned = stringIndex.get(value);
    if (interned === undefined) {
      interned = strings.length;
      strings.push(value);
      stringIndex.set(value, interned);
    }
    ops.keyString[index] = interned;
  });
  fillBooleans(column(opColumns, 3, 4), ops.insert);
  fillRle(column(opColumns, 4, 2), ops.action, 0);
  fillRle(column(opColumns, 5, 6), ops.valueMeta, 0);
  fillRle(column(opColumns, 8, 0), ops.succCount, 0);
  const succTotal = sum(ops.succCount);
  ops.succActor = new Int32Array(succTotal);
  ops.succCounter = new Uint32Array(succTotal);
  fillRle(column(opColumns, 8, 1), ops.succActor, -1);
  fillDelta(column(opColumns, 8, 3), ops.succCounter, 0);
  return { actors, heads, strings, ops, changes };
};

export type ReadChange = {
  actor: string;
  seq: number;
  startOp: number;
  time: number;
  message: string | null;
  deps: string[];
  hash: string;
  ops: {
    action: string;
    obj: string;
    key?: string;
    elemId?: string;
    insert?: boolean;
    value?: unknown;
    datatype?: string;
    pred: string[];
  }[];
};

/**
 * `A.decodeChange` in JS: a change chunk's header and ops, and its hash. `bytes`
 * may hold several chunks back to back; `offset` says where this one starts, and `end` in the result
 * where it stopped.
 */
export const readChange = (bytes: Uint8Array, offset = 0): ReadChange & { end: number } => {
  const cursor = new Cursor(bytes, offset);
  const { type, hash, end } = openChunk(cursor);
  if (type === 2) {
    throw new Error('Compressed change chunks are not supported; send changes uncompressed');
  }
  if (type !== 1) {
    throw new Error(`Expected a change chunk, got type ${type}`);
  }
  const deps: string[] = [];
  for (let count = cursor.uleb(); count > 0; count--) {
    deps.push(hex(cursor.take(32)));
  }
  const actor = hex(cursor.take(cursor.uleb()));
  const seq = cursor.uleb();
  const startOp = cursor.uleb();
  const time = cursor.leb();
  const messageLength = cursor.uleb();
  const message = messageLength > 0 ? decoder.decode(cursor.take(messageLength)) : null;
  const actors = [actor];
  for (let count = cursor.uleb(); count > 0; count--) {
    actors.push(hex(cursor.take(cursor.uleb())));
  }
  const specs = readColumns(cursor);
  const columns = sliceColumns(new Cursor(bytes, cursor.offset, end), specs);
  const op = opener(columns);
  const objActor = op.integers(0, 1);
  const objCounter = op.integers(0, 2);
  const keyActor = op.integers(1, 1);
  const keyCounter = op.integers(1, 3);
  const keyString = op.strings(1);
  const insert = op.booleans(3);
  const action = op.integers(4, 2);
  const valueMeta = op.integers(5, 6);
  const rawBytes = columns.get((5 << 4) | 7);
  const raw = rawBytes ? new Cursor(rawBytes) : undefined;
  const predCount = op.integers(7, 0);
  const predActor = op.integers(7, 1);
  const predCounter = op.integers(7, 3);
  const id = (actorIndex: number, counter: number) => `${counter}@${actors[actorIndex]}`;
  const ops: ReadChange['ops'] = [];
  for (;;) {
    const actionCode = next(action);
    if (actionCode === null) {
      break;
    }
    const oActor = next(objActor);
    const oCounter = next(objCounter) ?? 0;
    const kActor = next(keyActor);
    const kCounter = next(keyCounter) ?? 0;
    const kString = next(keyString);
    const isInsert = next(insert) ?? false;
    const name = ACTIONS[actionCode];
    const { value, datatype } = readValue(next(valueMeta) ?? 0, raw);
    const pred: string[] = [];
    for (let count = next(predCount) ?? 0; count > 0; count--) {
      pred.push(id(must(next(predActor), 'pred actor'), must(next(predCounter), 'pred counter')));
    }
    const scalar = name === 'set' || name === 'inc';
    ops.push({
      action: name,
      obj: oActor === null ? '_root' : id(oActor, oCounter),
      ...(kString !== null ? { key: kString } : { elemId: kActor === null ? '_head' : id(kActor, kCounter) }),
      ...(isInsert ? { insert: true } : {}),
      ...(name === 'set' && datatype !== undefined ? { datatype } : {}),
      ...(scalar ? { value } : {}),
      pred,
    });
  }
  return { actor, seq, startOp, time, message, deps, hash: hex(hash), ops, end };
};
