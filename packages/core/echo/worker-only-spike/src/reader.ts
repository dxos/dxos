//
// Copyright 2026 DXOS.org
//

// Reads Automerge's binary formats without Automerge: a saved document (a document chunk) and change
// chunks. Columns must be uncompressed: the host sends `saveNoCompress()` bytes and uncompressed
// changes, so the tab needs no DEFLATE.

import { sha256 } from './sha256.ts';

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

export type SavedOp = {
  obj: readonly [number, number] | null;
  key: string | readonly [number, number] | null;
  id: readonly [number, number];
  insert: boolean;
  action: string;
  value: unknown;
  datatype?: string;
  succ: (readonly [number, number])[];
};

export type SavedChange = {
  actor: number;
  seq: number;
  maxOp: number;
  time: number;
  message: string | null;
  deps: number[];
};

export type Saved = { actors: string[]; heads: string[]; changes: SavedChange[]; ops: SavedOp[] };

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

/** Every op of a saved document in stored order, with actor indexes, plus the change metadata. */
export const readSaved = (bytes: Uint8Array): Saved => {
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

  const change = opener(changeColumns);
  const cActor = change.integers(0, 1);
  const cSeq = change.integers(0, 3);
  const cMaxOp = change.integers(1, 3);
  const cTime = change.integers(2, 3);
  const cMessage = change.strings(3);
  const cDepCount = change.integers(4, 0);
  const cDepIndex = change.integers(4, 3);
  const changes: SavedChange[] = [];
  for (;;) {
    const actor = next(cActor);
    if (actor === null) {
      break;
    }
    const saved: SavedChange = {
      actor,
      seq: must(next(cSeq), 'seq'),
      maxOp: must(next(cMaxOp), 'max op'),
      time: next(cTime) ?? 0,
      message: next(cMessage),
      deps: [],
    };
    for (let count = next(cDepCount) ?? 0; count > 0; count--) {
      saved.deps.push(must(next(cDepIndex), 'dependency'));
    }
    changes.push(saved);
  }

  const op = opener(opColumns);
  const objActor = op.integers(0, 1);
  const objCounter = op.integers(0, 2);
  const keyActor = op.integers(1, 1);
  const keyCounter = op.integers(1, 3);
  const keyString = op.strings(1);
  const idActor = op.integers(2, 1);
  const idCounter = op.integers(2, 3);
  const insert = op.booleans(3);
  const action = op.integers(4, 2);
  const valueMeta = op.integers(5, 6);
  const rawBytes = opColumns.get((5 << 4) | 7);
  const raw = rawBytes ? new Cursor(rawBytes) : undefined;
  const succCount = op.integers(8, 0);
  const succActor = op.integers(8, 1);
  const succCounter = op.integers(8, 3);
  const ops: SavedOp[] = [];
  for (;;) {
    const actor = next(idActor);
    if (actor === null) {
      break;
    }
    const oActor = next(objActor);
    const oCounter = next(objCounter);
    const kActor = next(keyActor);
    const kCounter = next(keyCounter);
    const kString = next(keyString);
    const saved: SavedOp = {
      obj: oActor === null ? null : [oActor, must(oCounter, 'object counter')],
      key: kString !== null ? kString : kActor === null ? null : [kActor, must(kCounter, 'key counter')],
      id: [actor, must(next(idCounter), 'op counter')],
      insert: next(insert) ?? false,
      action: ACTIONS[must(next(action), 'action')],
      value: undefined,
      succ: [],
    };
    Object.assign(saved, readValue(next(valueMeta) ?? 0, raw));
    for (let count = next(succCount) ?? 0; count > 0; count--) {
      saved.succ.push([must(next(succActor), 'successor actor'), must(next(succCounter), 'successor counter')]);
    }
    ops.push(saved);
  }
  return { actors, heads, changes, ops };
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
