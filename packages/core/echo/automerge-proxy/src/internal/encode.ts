//
// Copyright 2026 DXOS.org
//

import { sha256 } from '@noble/hashes/sha2';

import { type DecodedOp, compareIds, parseId } from './ids.ts';

// Encodes a change as an Automerge change chunk, byte for byte as Automerge writes it, so a tab knows
// its change's hash the moment it writes it. The bytes must be canonical: Automerge 3 re-encodes a
// change from its op store when it exports one, so a change applied from any other bytes is exported
// under a different hash than the one its heads carry.

class Writer {
  readonly bytes: number[] = [];

  byte(value: number): void {
    this.bytes.push(value & 0xff);
  }

  uleb(value: number): void {
    // A value that is not an integer never reaches zero, and the loop would fill memory.
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`Cannot encode ${value} as an unsigned integer`);
    }
    let rest = value;
    do {
      let byte = rest % 128;
      rest = Math.floor(rest / 128);
      if (rest > 0) {
        byte |= 0x80;
      }
      this.byte(byte);
    } while (rest > 0);
  }

  leb(value: number): void {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`Cannot encode ${value} as an integer`);
    }
    let rest = value;
    for (;;) {
      const byte = rest & 0x7f;
      rest = Math.floor(rest / 128);
      const done = (rest === 0 && (byte & 0x40) === 0) || (rest === -1 && (byte & 0x40) !== 0);
      this.byte(done ? byte : byte | 0x80);
      if (done) {
        return;
      }
    }
  }

  raw(bytes: ArrayLike<number>): void {
    for (let i = 0; i < bytes.length; i++) {
      this.byte(bytes[i]);
    }
  }
}

type RunState<T> =
  | { kind: 'empty' }
  | { kind: 'nulls'; count: number }
  | { kind: 'lone'; value: T }
  | { kind: 'run'; value: T; count: number }
  | { kind: 'literal'; values: T[] };

/** Automerge's run-length encoder: runs, literal runs and null runs, in the order it splits them. */
class RunLength<T> {
  readonly #writer = new Writer();
  #state: RunState<T> = { kind: 'empty' };
  /** Whether any value other than null was appended. */
  #hasValue = false;

  readonly write: (writer: Writer, value: T) => void;

  constructor(write: (writer: Writer, value: T) => void) {
    this.write = write;
  }

  #flush(): void {
    const state = this.#state;
    if (state.kind === 'nulls') {
      this.#writer.leb(0);
      this.#writer.uleb(state.count);
    } else if (state.kind === 'lone') {
      this.#writer.leb(-1);
      this.write(this.#writer, state.value);
    } else if (state.kind === 'run') {
      this.#writer.leb(state.count);
      this.write(this.#writer, state.value);
    } else if (state.kind === 'literal') {
      this.#writer.leb(-state.values.length);
      state.values.forEach((value) => this.write(this.#writer, value));
    }
  }

  append(value: T | null): void {
    const state = this.#state;
    if (value === null) {
      if (state.kind === 'empty') {
        this.#state = { kind: 'nulls', count: 1 };
      } else if (state.kind === 'nulls') {
        state.count++;
      } else {
        this.#flush();
        this.#state = { kind: 'nulls', count: 1 };
      }
      return;
    }
    this.#hasValue = true;
    if (state.kind === 'empty') {
      this.#state = { kind: 'lone', value };
    } else if (state.kind === 'nulls') {
      this.#flush();
      this.#state = { kind: 'lone', value };
    } else if (state.kind === 'lone') {
      this.#state =
        state.value === value ? { kind: 'run', value, count: 2 } : { kind: 'literal', values: [state.value, value] };
    } else if (state.kind === 'run') {
      if (state.value === value) {
        state.count++;
      } else {
        this.#flush();
        this.#state = { kind: 'lone', value };
      }
    } else if (state.values[state.values.length - 1] === value) {
      state.values.pop();
      this.#flush();
      this.#state = { kind: 'run', value, count: 2 };
    } else {
      state.values.push(value);
    }
  }

  finish(): number[] {
    // A column of nothing but nulls is left out.
    if (!this.#hasValue) {
      return [];
    }
    this.#flush();
    return this.#writer.bytes;
  }
}

class Delta {
  readonly #runs = new RunLength<number>((writer, value) => writer.leb(value));
  #last = 0;

  append(value: number | null): void {
    if (value === null) {
      this.#runs.append(null);
    } else {
      this.#runs.append(value - this.#last);
      this.#last = value;
    }
  }

  finish(): number[] {
    return this.#runs.finish();
  }
}

class Booleans {
  readonly #writer = new Writer();
  #last = false;
  #count = 0;
  #appended = false;

  append(value: boolean): void {
    this.#appended = true;
    if (value === this.#last) {
      this.#count++;
    } else {
      this.#writer.uleb(this.#count);
      this.#last = value;
      this.#count = 1;
    }
  }

  finish(): number[] {
    if (!this.#appended) {
      return [];
    }
    this.#writer.uleb(this.#count);
    return this.#writer.bytes;
  }
}

const ACTIONS: Record<string, number> = { makeMap: 0, set: 1, makeList: 2, del: 3, makeText: 4, inc: 5 };

const utf8 = new TextEncoder();

const hexToBytes = (hex: string): Uint8Array => Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16));

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/** A value whose datatype says it is a number. */
const numeric = (value: unknown, datatype: string): number => {
  if (typeof value !== 'number') {
    throw new TypeError(`A ${datatype} value must be a number, not ${typeof value}`);
  }
  return value;
};

/** The value metadata type code and raw bytes Automerge stores for an op's value. */
const valueOf = (op: DecodedOp): [number, number[]] => {
  if (op.action !== 'set' && op.action !== 'inc') {
    return [0, []];
  }
  const value = op.value;
  const writer = new Writer();
  switch (op.datatype) {
    case 'int':
      writer.leb(numeric(value, 'int'));
      return [4, writer.bytes];
    case 'uint':
      writer.uleb(numeric(value, 'uint'));
      return [3, writer.bytes];
    case 'float64': {
      const bytes = new Uint8Array(8);
      new DataView(bytes.buffer).setFloat64(0, numeric(value, 'float64'), true);
      return [5, [...bytes]];
    }
    case 'counter':
      writer.leb(numeric(value, 'counter'));
      return [8, writer.bytes];
    case 'timestamp':
      writer.leb(numeric(value, 'timestamp'));
      return [9, writer.bytes];
  }
  if (op.action === 'inc') {
    writer.leb(numeric(value, 'inc'));
    return [4, writer.bytes];
  }
  if (value === null || value === undefined) {
    return [0, []];
  }
  if (value === false) {
    return [1, []];
  }
  if (value === true) {
    return [2, []];
  }
  if (typeof value === 'string') {
    return [6, [...utf8.encode(value)]];
  }
  if (typeof value === 'number') {
    writer.leb(value);
    return [4, writer.bytes];
  }
  if (value instanceof Uint8Array) {
    return [7, [...value]];
  }
  throw new TypeError(`Unsupported value ${String(value)}`);
};

/** Preds in Lamport order, as Automerge stores them. */
export const sortedPreds = (pred: readonly string[]) => pred.map(parseId).sort(compareIds);

export type EncodableChange = {
  actor: string;
  seq: number;
  startOp: number;
  time: number;
  message: string | null;
  deps: readonly string[];
  ops: readonly DecodedOp[];
};

export type EncodeOptions = {
  /** `'given'` keeps each op's preds as listed, which is not canonical; only tests of the worker's check use it. */
  predOrder?: 'lamport' | 'given';
};

/** The change chunk and its hash, as Automerge would write this change. */
export const encodeChange = (
  change: EncodableChange,
  { predOrder = 'lamport' }: EncodeOptions = {},
): { bytes: Uint8Array; hash: string } => {
  // Actor index 0 is the change's own actor; the others follow in sorted order.
  const others = new Set<string>();
  const note = (actor: string) => actor !== change.actor && others.add(actor);
  for (const op of change.ops) {
    if (op.obj !== '_root') {
      note(parseId(op.obj)[1]);
    }
    if (op.elemId !== undefined && op.elemId !== '_head') {
      note(parseId(op.elemId)[1]);
    }
    op.pred.forEach((pred) => note(parseId(pred)[1]));
  }
  const otherActors = [...others].sort();
  const actorIndex = (actor: string) => (actor === change.actor ? 0 : otherActors.indexOf(actor) + 1);

  const uleb = (writer: Writer, value: number) => writer.uleb(value);
  const objActor = new RunLength<number>(uleb);
  const objCounter = new RunLength<number>(uleb);
  const keyActor = new RunLength<number>(uleb);
  const keyCounter = new Delta();
  const keyString = new RunLength<string>((writer, value) => {
    const bytes = utf8.encode(value);
    writer.uleb(bytes.length);
    writer.raw(bytes);
  });
  const insert = new Booleans();
  const action = new RunLength<number>(uleb);
  const valueMeta = new RunLength<number>(uleb);
  const valueRaw = new Writer();
  const predCount = new RunLength<number>(uleb);
  const predActor = new RunLength<number>(uleb);
  const predCounter = new Delta();
  for (const op of change.ops) {
    if (op.obj === '_root') {
      objActor.append(null);
      objCounter.append(null);
    } else {
      const [counter, actor] = parseId(op.obj);
      objActor.append(actorIndex(actor));
      objCounter.append(counter);
    }
    if (op.key !== undefined) {
      keyActor.append(null);
      keyCounter.append(null);
      keyString.append(op.key);
    } else if (op.elemId === undefined) {
      throw new Error('An op needs a key or an element');
    } else if (op.elemId === '_head') {
      keyActor.append(null);
      keyCounter.append(0);
      keyString.append(null);
    } else {
      const [counter, actor] = parseId(op.elemId);
      keyActor.append(actorIndex(actor));
      keyCounter.append(counter);
      keyString.append(null);
    }
    insert.append(op.insert === true);
    action.append(ACTIONS[op.action]);
    const [type, raw] = valueOf(op);
    valueMeta.append(raw.length * 16 + type);
    valueRaw.raw(raw);
    predCount.append(op.pred.length);
    for (const [counter, actor] of predOrder === 'lamport' ? sortedPreds(op.pred) : op.pred.map(parseId)) {
      predActor.append(actorIndex(actor));
      predCounter.append(counter);
    }
  }
  const specs: [number, number[]][] = [
    [1, objActor.finish()],
    [2, objCounter.finish()],
    [17, keyActor.finish()],
    [19, keyCounter.finish()],
    [21, keyString.finish()],
    [52, insert.finish()],
    [66, action.finish()],
    [86, valueMeta.finish()],
    [87, valueRaw.bytes],
    [112, predCount.finish()],
    [113, predActor.finish()],
    [115, predCounter.finish()],
  ];
  const columns = specs.filter(([, bytes]) => bytes.length > 0);

  const data = new Writer();
  const deps = [...change.deps].sort();
  data.uleb(deps.length);
  deps.forEach((dep) => data.raw(hexToBytes(dep)));
  const actor = hexToBytes(change.actor);
  data.uleb(actor.length);
  data.raw(actor);
  data.uleb(change.seq);
  data.uleb(change.startOp);
  data.leb(change.time);
  const message = change.message ? utf8.encode(change.message) : new Uint8Array();
  data.uleb(message.length);
  data.raw(message);
  data.uleb(otherActors.length);
  for (const other of otherActors) {
    const bytes = hexToBytes(other);
    data.uleb(bytes.length);
    data.raw(bytes);
  }
  data.uleb(columns.length);
  for (const [spec, bytes] of columns) {
    data.uleb(spec);
    data.uleb(bytes.length);
  }
  columns.forEach(([, bytes]) => data.raw(bytes));

  const header = new Writer();
  header.byte(1);
  header.uleb(data.bytes.length);
  const hashed = Uint8Array.from([...header.bytes, ...data.bytes]);
  const hash = sha256(hashed);
  const bytes = new Uint8Array(8 + hashed.length);
  bytes.set([0x85, 0x6f, 0x4a, 0x83]);
  bytes.set(hash.subarray(0, 4), 4);
  bytes.set(hashed, 8);
  return { bytes, hash: bytesToHex(hash) };
};
