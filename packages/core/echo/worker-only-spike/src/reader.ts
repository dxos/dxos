//
// Copyright 2026 DXOS.org
//

// Reads a saved Automerge document (a document chunk) without Automerge. Columns must be uncompressed:
// the host sends `saveNoCompress()` bytes, so the tab needs no DEFLATE.

const ACTIONS = ['makeMap', 'set', 'makeList', 'del', 'makeText', 'inc'];

const decoder = new TextDecoder();

class Cursor {
  constructor(
    readonly bytes: Uint8Array,
    public offset = 0,
    readonly end = bytes.length,
  ) {}

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

const column = (type: number, cursor: Cursor): Generator<unknown> => {
  switch (type) {
    case 0:
    case 1:
    case 2:
    case 6:
      return rle(cursor, (c) => c.uleb());
    case 3:
      return delta(cursor);
    case 4:
      return booleans(cursor);
    case 5:
      return rle(cursor, (c) => decoder.decode(c.take(c.uleb())));
    default:
      throw new Error(`Unsupported column type ${type}`);
  }
};

type Columns = Map<number, Uint8Array>;

const readColumns = (cursor: Cursor, bytes: Uint8Array): { specs: { spec: number; length: number }[] } => {
  const count = cursor.uleb();
  const specs = [];
  for (let i = 0; i < count; i++) {
    specs.push({ spec: cursor.uleb(), length: cursor.uleb() });
  }
  void bytes;
  return { specs };
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

const opener = (columns: Columns) => {
  const open = (id: number, type: number): Generator<unknown> | undefined => {
    const bytes = columns.get((id << 4) | type);
    return bytes ? column(type, new Cursor(bytes)) : undefined;
  };
  return open;
};

const next = <T>(iterator: Generator<unknown> | undefined): T | null =>
  iterator ? ((iterator.next().value as T | undefined) ?? null) : null;

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

/** Every op of a saved document in stored order, with actor indexes, plus the change metadata. */
export const readSaved = (bytes: Uint8Array): Saved => {
  const cursor = new Cursor(bytes);
  const magic = cursor.take(4);
  if (magic[0] !== 0x85 || magic[1] !== 0x6f || magic[2] !== 0x4a || magic[3] !== 0x83) {
    throw new Error('Not an Automerge chunk');
  }
  cursor.take(4);
  const type = cursor.byte();
  cursor.uleb();
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
  const changeSpecs = readColumns(cursor, bytes).specs;
  const opSpecs = readColumns(cursor, bytes).specs;
  const changeColumns = sliceColumns(cursor, changeSpecs);
  const opColumns = sliceColumns(cursor, opSpecs);

  const openChange = opener(changeColumns);
  const cActor = openChange(0, 1);
  const cSeq = openChange(0, 3);
  const cMaxOp = openChange(1, 3);
  const cTime = openChange(2, 3);
  const cMessage = openChange(3, 5);
  const cDepCount = openChange(4, 0);
  const cDepIndex = openChange(4, 3);
  const changes: SavedChange[] = [];
  for (;;) {
    const actor = next<number>(cActor);
    if (actor === null) {
      break;
    }
    const change: SavedChange = {
      actor,
      seq: next<number>(cSeq)!,
      maxOp: next<number>(cMaxOp)!,
      time: next<number>(cTime) ?? 0,
      message: next<string>(cMessage),
      deps: [],
    };
    for (let count = next<number>(cDepCount) ?? 0; count > 0; count--) {
      change.deps.push(next<number>(cDepIndex)!);
    }
    changes.push(change);
  }

  const open = opener(opColumns);
  const objActor = open(0, 1);
  const objCounter = open(0, 2);
  const keyActor = open(1, 1);
  const keyCounter = open(1, 3);
  const keyString = open(1, 5);
  const idActor = open(2, 1);
  const idCounter = open(2, 3);
  const insert = open(3, 4);
  const action = open(4, 2);
  const valueMeta = open(5, 6);
  const rawBytes = opColumns.get((5 << 4) | 7);
  const raw = rawBytes ? new Cursor(rawBytes) : undefined;
  const succCount = open(8, 0);
  const succActor = open(8, 1);
  const succCounter = open(8, 3);
  const ops: SavedOp[] = [];
  for (;;) {
    const actor = next<number>(idActor);
    if (actor === null) {
      break;
    }
    const oActor = next<number>(objActor);
    const oCounter = next<number>(objCounter);
    const kActor = next<number>(keyActor);
    const kCounter = next<number>(keyCounter);
    const kString = next<string>(keyString);
    const op: SavedOp = {
      obj: oActor === null ? null : [oActor, oCounter!],
      key: kString !== null ? kString : kActor === null ? null : [kActor, kCounter!],
      id: [actor, next<number>(idCounter)!],
      insert: next<boolean>(insert) ?? false,
      action: ACTIONS[next<number>(action)!],
      value: undefined,
      succ: [],
    };
    const meta = next<number>(valueMeta) ?? 0;
    const length = Math.floor(meta / 16);
    const valueType = meta & 0xf;
    if (raw && length > 0) {
      const value = raw.take(length);
      op.datatype = (
        { 3: 'uint', 4: 'int', 5: 'float64', 6: 'str', 7: 'bytes', 8: 'counter', 9: 'timestamp' } as Record<
          number,
          string
        >
      )[valueType];
      if (valueType === 6) {
        op.value = decoder.decode(value);
      } else if (valueType === 3) {
        op.value = new Cursor(value).uleb();
      } else if (valueType === 4 || valueType === 8 || valueType === 9) {
        op.value = new Cursor(value).leb();
      } else if (valueType === 5) {
        op.value = new DataView(value.buffer, value.byteOffset, 8).getFloat64(0, true);
      } else {
        op.value = value.slice();
      }
    } else {
      op.value = valueType === 1 ? false : valueType === 2 ? true : valueType === 6 ? '' : null;
      if (valueType === 6) {
        op.datatype = 'str';
      }
    }
    for (let count = next<number>(succCount) ?? 0; count > 0; count--) {
      op.succ.push([next<number>(succActor)!, next<number>(succCounter)!]);
    }
    ops.push(op);
  }
  return { actors, heads, changes, ops };
};
