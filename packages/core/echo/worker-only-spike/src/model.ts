//
// Copyright 2026 DXOS.org
//

import { ChangeTable, room, writeHash } from './changes.ts';
import { encodeChange } from './encode.ts';
import { type Change, type Clock, type DecodedOp, parseId } from './ids.ts';
import { immutableString } from './immutable-string.ts';
import { type SavedChanges, readSavedColumns } from './reader.ts';

export type Patch =
  | { action: 'put'; path: (string | number)[]; value: unknown; conflict?: boolean }
  | { action: 'conflict'; path: (string | number)[] }
  | { action: 'del'; path: (string | number)[]; length?: number }
  | { action: 'insert'; path: (string | number)[]; values: unknown[] }
  | { action: 'splice'; path: (string | number)[]; value: string };

/** An element as the model hands it out: its id and the op that inserted it. */
export type Elem = { readonly key: string; readonly op: number };

/** A change's place in the history, as `A.getChangesMetaSince` describes it. */
export type ChangeInfo = {
  actor: string;
  seq: number;
  startOp: number;
  maxOp: number;
  deps: string[];
  time: number;
  message: string | null;
};

// Action codes, numbered as Automerge's op columns number them.
const ACTIONS = ['makeMap', 'set', 'makeList', 'del', 'makeText', 'inc', 'makeTable'];
const ACTION_CODES = new Map(ACTIONS.map((name, code) => [name, code]));
const MAKE_MAP = 0;
const SET = 1;
const MAKE_LIST = 2;
const DEL = 3;
const MAKE_TEXT = 4;
const INC = 5;
const MAKE_TABLE = 6;

// An op's flags: its action, whether it inserts, the kind of its value, and markers that spare a map lookup.
const ACTION_MASK = 0x7;
const INSERT = 0x8;
const KIND_SHIFT = 4;
const KIND_MASK = 0x70;
const REMOVED = 0x80;
const HAS_LATER = 0x100;
const MORE_SUCC = 0x200;
const MORE_PRED = 0x400;

// Value kinds: small values live in the value column, anything else in `#extra`.
const NONE = 0;
const NULL = 1;
const FALSE = 2;
const TRUE = 3;
const CHAR = 4;
const INT = 5;
const EXTRA = 6;

const ROOT = -1;

type MapObject = { type: 'map'; keys: Map<number, number[]> };

/** A sequence's elements are their insert ops, in document order. */
type SeqObject = { type: 'list' | 'text'; elems: Int32Array; length: number };

type ObjectInfo = MapObject | SeqObject;

const isMake = (action: number): boolean =>
  action === MAKE_MAP || action === MAKE_LIST || action === MAKE_TEXT || action === MAKE_TABLE;

const newObject = (action: number): ObjectInfo =>
  action === MAKE_MAP || action === MAKE_TABLE
    ? { type: 'map', keys: new Map() }
    : { type: action === MAKE_TEXT ? 'text' : 'list', elems: new Int32Array(8), length: 0 };

const UTF16 = new TextDecoder('utf-16le');
const UTF8 = new TextDecoder();

/** Whether a string is one Unicode scalar value, which is what a text element holds. */
const isOneCodePoint = (value: string): boolean =>
  value.length === 1 || (value.length === 2 && (value.codePointAt(0) ?? 0) > 0xffff);

type Typed = Uint8Array | Uint16Array | Uint32Array | Int32Array;

const resize = <T extends Typed>(array: T, capacity: number, make: (length: number) => T): T => {
  const next = make(capacity);
  next.set(array.subarray(0, Math.min(array.length, capacity)));
  return next;
};

/** A LEB128 integer at `offset`. */
const readLeb = (bytes: Uint8Array, offset: number, signed: boolean): number => {
  let result = 0;
  let shift = 0;
  let byte = 0;
  let position = offset;
  do {
    byte = bytes[position++];
    result += (byte & 0x7f) * 2 ** shift;
    shift += 7;
  } while (byte & 0x80);
  return signed && byte & 0x40 ? result - 2 ** shift : result;
};

/**
 * The code point of `bytes[offset, offset + length)` when they encode exactly one UTF-8 character, or -1.
 * Most text ops hold one character, so this spares a `TextDecoder` call and a string per op.
 */
const singleCodePoint = (bytes: Uint8Array, offset: number, length: number): number => {
  const first = bytes[offset];
  if (length === 1) {
    return first < 0x80 ? first : -1;
  }
  const second = bytes[offset + 1];
  if (length === 2) {
    const point = ((first & 0x1f) << 6) | (second & 0x3f);
    return (first & 0xe0) === 0xc0 && (second & 0xc0) === 0x80 && point >= 0x80 ? point : -1;
  }
  const third = bytes[offset + 2];
  if (length === 3) {
    const point = ((first & 0x0f) << 12) | ((second & 0x3f) << 6) | (third & 0x3f);
    const valid = (first & 0xf0) === 0xe0 && (second & 0xc0) === 0x80 && (third & 0xc0) === 0x80;
    return valid && point >= 0x800 && (point < 0xd800 || point > 0xdfff) ? point : -1;
  }
  const fourth = bytes[offset + 3];
  if (length === 4) {
    const point = ((first & 0x07) << 18) | ((second & 0x3f) << 12) | ((third & 0x3f) << 6) | (fourth & 0x3f);
    const valid =
      (first & 0xf8) === 0xf0 && (second & 0xc0) === 0x80 && (third & 0xc0) === 0x80 && (fourth & 0xc0) === 0x80;
    return valid && point >= 0x10000 && point <= 0x10ffff ? point : -1;
  }
  return -1;
};

/** The first position in `counters[0, length)` whose counter is at least `counter`. */
const bisect = (counters: Uint32Array, length: number, counter: number): number => {
  let low = 0;
  let high = length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (counters[middle] < counter) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

/**
 * A whole Automerge document as plain JS: every op with the ops that overwrote it, so the state at any
 * version, cursors, conflicts and diffs come out of one structure. Ops live in typed-array columns,
 * one row per op, instead of one JS object per op.
 */
export class Model {
  readonly #actors: string[] = [];
  readonly #actorIndex = new Map<string, number>();
  /** Each actor's place in sorted order, so op ids compare by number instead of by string. */
  #rank = new Int32Array(0);
  #count = 0;
  #ctr = new Uint32Array(64);
  #act = new Uint16Array(64);
  /** The op that made the containing object, or -1 for the root. */
  #obj = new Int32Array(64);
  /** A map op's key, as an index into `#keys`; a sequence op's element (the one an insert follows), or -1 for the head. */
  #key = new Int32Array(64);
  #val = new Int32Array(64);
  #flags = new Uint16Array(64);
  /** The first op that overwrote or deleted this one, or -1; `#moreSucc` holds the rest. */
  #succ = new Int32Array(64);
  /** The first op this one overwrote, or -1; `#morePred` holds the rest. */
  #pred = new Int32Array(64);
  readonly #moreSucc = new Map<number, number[]>();
  readonly #morePred = new Map<number, number[]>();
  readonly #extra: unknown[] = [];
  readonly #extraType: (string | undefined)[] = [];
  readonly #keys: string[] = [];
  readonly #keyIndex = new Map<string, number>();
  readonly #objects = new Map<number, ObjectInfo>([[ROOT, { type: 'map', keys: new Map() }]]);
  /** An element's values written after its insert. */
  readonly #later = new Map<number, number[]>();
  /** Per actor, its op counters in order and the op at each. */
  readonly #idCtr: Uint32Array[] = [];
  readonly #idOp: Int32Array[] = [];
  readonly #idLength: number[] = [];
  readonly #changes = new ChangeTable();
  #maxOp = 0;

  /** The highest op counter the model holds. */
  get maxOp(): number {
    return this.#maxOp;
  }

  #actorOf(actor: string): number {
    let index = this.#actorIndex.get(actor);
    if (index === undefined) {
      index = this.#actors.length;
      this.#actors.push(actor);
      this.#actorIndex.set(actor, index);
      this.#idCtr.push(new Uint32Array(16));
      this.#idOp.push(new Int32Array(16));
      this.#idLength.push(0);
      const order = this.#actors
        .map((_actor, position) => position)
        .sort((left, right) => {
          const leftActor = this.#actors[left];
          const rightActor = this.#actors[right];
          return leftActor < rightActor ? -1 : leftActor > rightActor ? 1 : 0;
        });
      this.#rank = new Int32Array(this.#actors.length);
      order.forEach((position, rank) => {
        this.#rank[position] = rank;
      });
    }
    return index;
  }

  #intern(key: string): number {
    let index = this.#keyIndex.get(key);
    if (index === undefined) {
      index = this.#keys.length;
      this.#keys.push(key);
      this.#keyIndex.set(key, index);
    }
    return index;
  }

  #reserve(size: number): void {
    if (size > this.#ctr.length) {
      this.#resizeOps(room(size));
    }
  }

  #resizeOps(capacity: number): void {
    this.#ctr = resize(this.#ctr, capacity, (length) => new Uint32Array(length));
    this.#act = resize(this.#act, capacity, (length) => new Uint16Array(length));
    this.#obj = resize(this.#obj, capacity, (length) => new Int32Array(length));
    this.#key = resize(this.#key, capacity, (length) => new Int32Array(length));
    this.#val = resize(this.#val, capacity, (length) => new Int32Array(length));
    this.#flags = resize(this.#flags, capacity, (length) => new Uint16Array(length));
    this.#succ = resize(this.#succ, capacity, (length) => new Int32Array(length));
    this.#pred = resize(this.#pred, capacity, (length) => new Int32Array(length));
  }

  #newOp(counter: number, actor: number, obj: number, action: number, insert: boolean): number {
    this.#reserve(this.#count + 1);
    const op = this.#count++;
    this.#ctr[op] = counter;
    this.#act[op] = actor;
    this.#obj[op] = obj;
    this.#key[op] = -1;
    this.#val[op] = 0;
    this.#flags[op] = action | (insert ? INSERT : 0);
    this.#succ[op] = -1;
    this.#pred[op] = -1;
    if (isMake(action)) {
      this.#objects.set(op, newObject(action));
    }
    return op;
  }

  #indexId(op: number, sorted: boolean): void {
    const actor = this.#act[op];
    const counter = this.#ctr[op];
    let counters = this.#idCtr[actor];
    let ops = this.#idOp[actor];
    const length = this.#idLength[actor];
    if (length === counters.length) {
      counters = this.#idCtr[actor] = resize(counters, room(length + 1), (size) => new Uint32Array(size));
      ops = this.#idOp[actor] = resize(ops, room(length + 1), (size) => new Int32Array(size));
    }
    if (!sorted || length === 0 || counters[length - 1] < counter) {
      counters[length] = counter;
      ops[length] = op;
    } else {
      const at = bisect(counters, length, counter);
      counters.copyWithin(at + 1, at, length);
      ops.copyWithin(at + 1, at, length);
      counters[at] = counter;
      ops[at] = op;
    }
    this.#idLength[actor] = length + 1;
    this.#maxOp = Math.max(this.#maxOp, counter);
  }

  /**
   * Sorts each actor's ids by counter after a load appended them out of order. Only the part after the
   * sorted prefix is sorted, then merged in, so appending a few ids to sorted ones costs a linear pass.
   */
  #sortIds(): void {
    this.#idCtr.forEach((counters, actor) => {
      const length = this.#idLength[actor];
      let prefix = 1;
      while (prefix < length && counters[prefix - 1] <= counters[prefix]) {
        prefix++;
      }
      if (prefix >= length) {
        return;
      }
      if (length - prefix >= 2_097_152) {
        throw new RangeError('An actor has too many ops to sort');
      }
      const ops = this.#idOp[actor];
      // Counters fit 32 bits and positions 21, so both pack into one exact double, which sorts natively.
      const rest = new Float64Array(length - prefix);
      for (let i = prefix; i < length; i++) {
        rest[i - prefix] = counters[i] * 2_097_152 + (i - prefix);
      }
      rest.sort();
      const nextCounters = new Uint32Array(counters.length);
      const nextOps = new Int32Array(ops.length);
      let left = 0;
      let right = 0;
      for (let out = 0; out < length; out++) {
        const position = right < rest.length ? prefix + (rest[right] % 2_097_152) : -1;
        if (position < 0 || (left < prefix && counters[left] <= counters[position])) {
          nextCounters[out] = counters[left];
          nextOps[out] = ops[left++];
        } else {
          nextCounters[out] = counters[position];
          nextOps[out] = ops[position];
          right++;
        }
      }
      this.#idCtr[actor] = nextCounters;
      this.#idOp[actor] = nextOps;
    });
  }

  /** The op of `actor` with `counter`, or -1. */
  #lookup(actor: number, counter: number): number {
    const counters = this.#idCtr[actor];
    if (!counters) {
      return -1;
    }
    const length = this.#idLength[actor];
    const at = bisect(counters, length, counter);
    return at < length && counters[at] === counter ? this.#idOp[actor][at] : -1;
  }

  #find(id: string): number {
    const [counter, actor] = parseId(id);
    const index = this.#actorIndex.get(actor);
    return index === undefined ? -1 : this.#lookup(index, counter);
  }

  #require(id: string, what: string): number {
    const op = this.#find(id);
    if (op < 0) {
      throw new Error(`Unknown ${what} ${id}`);
    }
    return op;
  }

  #keyOf(op: number): string {
    return `${this.#ctr[op]}@${this.#actors[this.#act[op]]}`;
  }

  #objIdOf(op: number): string {
    return op === ROOT ? '_root' : this.#keyOf(op);
  }

  /** Lamport order: counter first, then actor. */
  #compare(left: number, right: number): number {
    return this.#ctr[left] - this.#ctr[right] || this.#rank[this.#act[left]] - this.#rank[this.#act[right]];
  }

  /** A clock as a limit per actor index, which the visibility checks read. */
  #limits(clock: Clock): Uint32Array {
    const limits = new Uint32Array(this.#actors.length);
    this.#actors.forEach((actor, index) => {
      limits[index] = clock.get(actor) ?? 0;
    });
    return limits;
  }

  /** Records that `succ` overwrote or deleted `op`. */
  #link(op: number, succ: number): void {
    if (this.#succ[op] < 0) {
      this.#succ[op] = succ;
    } else {
      const more = this.#moreSucc.get(op);
      if (more) {
        more.push(succ);
      } else {
        this.#moreSucc.set(op, [succ]);
        this.#flags[op] |= MORE_SUCC;
      }
    }
    if (this.#pred[succ] < 0) {
      this.#pred[succ] = op;
    } else {
      const more = this.#morePred.get(succ);
      if (more) {
        more.push(op);
      } else {
        this.#morePred.set(succ, [op]);
        this.#flags[succ] |= MORE_PRED;
      }
    }
  }

  #predsOf(op: number): number[] {
    const first = this.#pred[op];
    if (first < 0) {
      return [];
    }
    return this.#flags[op] & MORE_PRED ? [first, ...(this.#morePred.get(op) ?? [])] : [first];
  }

  //
  // Values.
  //

  /** Stores a scalar in the value column when it fits, otherwise in `#extra`. */
  #setValue(op: number, action: number, value: unknown, datatype: string | undefined): void {
    let kind = NONE;
    let slot = 0;
    if (action === SET || action === INC) {
      if (value === null) {
        kind = NULL;
      } else if (value === false) {
        kind = FALSE;
      } else if (value === true) {
        kind = TRUE;
      } else if (typeof value === 'string' && datatype === undefined && isOneCodePoint(value)) {
        kind = CHAR;
        slot = value.codePointAt(0) ?? 0;
      } else if (
        typeof value === 'number' &&
        (datatype === 'int' || (action === INC && datatype === undefined)) &&
        Number.isInteger(value) &&
        value >= -0x80000000 &&
        value <= 0x7fffffff
      ) {
        kind = INT;
        slot = value;
      } else {
        kind = EXTRA;
        slot = this.#extra.length;
        this.#extra.push(value);
        this.#extraType.push(datatype);
      }
    }
    this.#setKind(op, kind, slot);
  }

  #setKind(op: number, kind: number, slot: number): void {
    this.#flags[op] = (this.#flags[op] & ~KIND_MASK) | (kind << KIND_SHIFT);
    this.#val[op] = slot;
  }

  #kind(op: number): number {
    return (this.#flags[op] & KIND_MASK) >> KIND_SHIFT;
  }

  /** The scalar as a change carries it. */
  #rawValue(op: number): unknown {
    switch (this.#kind(op)) {
      case NULL:
        return null;
      case FALSE:
        return false;
      case TRUE:
        return true;
      case CHAR:
        return String.fromCodePoint(this.#val[op]);
      case INT:
        return this.#val[op];
      case EXTRA:
        return this.#extra[this.#val[op]];
      default:
        return undefined;
    }
  }

  #datatype(op: number): string | undefined {
    const kind = this.#kind(op);
    if (kind === INT) {
      return 'int';
    }
    return kind === EXTRA ? this.#extraType[this.#val[op]] : undefined;
  }

  /** Reads a saved op's value, `meta >>> 4` bytes of the raw column from `offset`. */
  #loadValue(op: number, action: number, meta: number, raw: Uint8Array, offset: number): void {
    const length = meta >>> 4;
    switch (meta & 0xf) {
      case 0:
        return this.#setValue(op, action, null, undefined);
      case 1:
        return this.#setValue(op, action, false, undefined);
      case 2:
        return this.#setValue(op, action, true, undefined);
      case 3:
        return this.#setValue(op, action, readLeb(raw, offset, false), 'uint');
      case 4:
        return this.#setValue(op, action, readLeb(raw, offset, true), 'int');
      case 5:
        return this.#setValue(
          op,
          action,
          new DataView(raw.buffer, raw.byteOffset + offset, 8).getFloat64(0, true),
          'float64',
        );
      case 6: {
        const point = length >= 1 && length <= 4 ? singleCodePoint(raw, offset, length) : -1;
        if (point >= 0 && (action === SET || action === INC)) {
          return this.#setKind(op, CHAR, point);
        }
        return this.#setValue(op, action, UTF8.decode(raw.subarray(offset, offset + length)), undefined);
      }
      case 8:
        return this.#setValue(op, action, readLeb(raw, offset, true), 'counter');
      case 9:
        return this.#setValue(op, action, readLeb(raw, offset, true), 'timestamp');
      default:
        return this.#setValue(op, action, raw.slice(offset, offset + length), undefined);
    }
  }

  //
  // Loading.
  //

  /**
   * A document read from Automerge's saved bytes, column by column. `hashes` holds each change's hash as
   * 32 bytes, back to back in the saved order; given none, it computes each by encoding the change again.
   * Either way it checks them against the saved heads, as Automerge's own load does.
   */
  static fromSaved(bytes: Uint8Array, hashes?: Uint8Array): Model {
    const model = new Model();
    const { actors, heads, strings, ops, changes } = readSavedColumns(bytes);
    const actorIndex = actors.map((actor) => model.#actorOf(actor));
    const keyIndex = strings.map((key) => model.#intern(key));
    const count = ops.count;
    model.#reserve(count + ops.succActor.length);

    // Every op, then each actor's ids sorted, so references resolve whatever order the ops are stored in.
    for (let i = 0; i < count; i++) {
      model.#newOp(ops.idCounter[i], actorIndex[ops.idActor[i]], ROOT, ops.action[i], ops.insert[i] === 1);
      model.#indexId(i, false);
    }
    model.#sortIds();
    const resolve = (actor: number, counter: number): number => {
      if (actor < 0) {
        return ROOT;
      }
      const op = model.#lookup(actorIndex[actor], counter);
      if (op < 0) {
        throw new Error(`A saved op names an unknown op ${counter}@${actors[actor]}`);
      }
      return op;
    };

    // Runs of ops share an object, and typing stores each character after the one it follows, so the
    // previous object and the previous op spare most lookups.
    let lastActor = -1;
    let lastCounter = 0;
    let obj = ROOT;
    let container = model.#object('_root');
    let offset = 0;
    for (let i = 0; i < count; i++) {
      const meta = ops.valueMeta[i];
      model.#loadValue(i, ops.action[i], meta, ops.raw, offset);
      offset += meta >>> 4;
      const objActor = ops.objActor[i];
      const objCounter = ops.objCounter[i];
      if (objActor !== lastActor || objCounter !== lastCounter) {
        obj = resolve(objActor, objCounter);
        const found = model.#objects.get(obj);
        if (!found) {
          throw new Error('A saved op names an object that is not one');
        }
        container = found;
        lastActor = objActor;
        lastCounter = objCounter;
      }
      model.#obj[i] = obj;
      if (container.type === 'map') {
        model.#key[i] = keyIndex[ops.keyString[i]] ?? model.#intern('');
      } else {
        const keyActor = ops.keyActor[i];
        const keyCounter = ops.keyCounter[i];
        model.#key[i] =
          i > 0 && keyActor === ops.idActor[i - 1] && keyCounter === ops.idCounter[i - 1]
            ? i - 1
            : resolve(keyActor, keyCounter);
      }
      // Saved documents store a sequence in document order, so its elements are appended as they come.
      model.#place(i, container, false);
    }

    // A saved document keeps no delete ops: a successor that is not an op is one.
    const deletes = new Map<number, number>();
    let succAt = 0;
    for (let i = 0; i < count; i++) {
      for (let remaining = ops.succCount[i]; remaining > 0; remaining--, succAt++) {
        const actor = actorIndex[ops.succActor[succAt]];
        const counter = ops.succCounter[succAt];
        let target = model.#lookup(actor, counter);
        if (target < 0) {
          const id = counter * 65_536 + actor;
          target = deletes.get(id) ?? -1;
          if (target < 0) {
            target = model.#newOp(counter, actor, model.#obj[i], DEL, false);
            const map = model.#objects.get(model.#obj[i])?.type === 'map';
            model.#key[target] = map || !(model.#flags[i] & INSERT) ? model.#key[i] : i;
            deletes.set(id, target);
          }
        }
        model.#link(i, target);
      }
    }
    for (const op of deletes.values()) {
      model.#indexId(op, false);
    }
    model.#sortIds();

    // A change's ops are its actor's ops above the previous change's highest op, so one pass per actor
    // over the sorted ids finds each change's first op. Saved changes come in causal order, which takes
    // each actor's changes in seq order; the sort is for a document that breaks that.
    let inSeqOrder = true;
    const lastSeq = new Uint32Array(actors.length);
    for (let index = 0; index < changes.count; index++) {
      const actor = changes.actor[index];
      if (actor < 0 || actor >= actors.length) {
        throw new Error('A saved change names no actor');
      }
      inSeqOrder &&= changes.seq[index] > lastSeq[actor];
      lastSeq[actor] = changes.seq[index];
    }
    const order = inSeqOrder
      ? undefined
      : Array.from({ length: changes.count }, (_value, index) => index).sort(
          (left, right) => changes.actor[left] - changes.actor[right] || changes.seq[left] - changes.seq[right],
        );
    const startOps = new Uint32Array(changes.count);
    const nextId = new Uint32Array(actors.length);
    for (let position = 0; position < changes.count; position++) {
      const index = order ? order[position] : position;
      const actor = actorIndex[changes.actor[index]];
      const counters = model.#idCtr[actor];
      const length = model.#idLength[actor];
      const maxOp = changes.maxOp[index];
      let next = nextId[actor];
      const first = next < length ? counters[next] : maxOp + 1;
      while (next < length && counters[next] <= maxOp) {
        next++;
      }
      nextId[actor] = next;
      startOps[index] = first <= maxOp ? first : maxOp + 1;
    }
    model.#changes.load(
      changes,
      actorIndex,
      startOps,
      hashes ?? model.#hashSaved(actors, actorIndex, changes, startOps),
    );
    if (model.#changes.heads().join() !== [...heads].sort().join()) {
      throw new Error('The saved heads do not match the changes read');
    }
    model.#trim();
    return model;
  }

  /** Each saved change's hash, found by encoding it again from the ops; deps are hashed before dependents. */
  #hashSaved(
    actors: readonly string[],
    actorIndex: readonly number[],
    changes: SavedChanges,
    startOps: Uint32Array,
  ): Uint8Array {
    const out = new Uint8Array(changes.count * 32);
    const known: string[] = [];
    let depAt = 0;
    for (let index = 0; index < changes.count; index++) {
      const deps: string[] = [];
      for (let remaining = changes.depCount[index]; remaining > 0; remaining--) {
        const dep = known[changes.deps[depAt++]];
        if (dep === undefined) {
          throw new Error('A saved change depends on a change after it');
        }
        deps.push(dep);
      }
      const actor = changes.actor[index];
      const startOp = startOps[index];
      const { hash } = encodeChange({
        actor: actors[actor],
        seq: changes.seq[index],
        startOp,
        time: changes.time[index],
        message: changes.message[index],
        deps,
        ops: this.#opsOf(actorIndex[actor], startOp, changes.maxOp[index]),
      });
      known.push(hash);
      writeHash(hash, out, index * 32);
    }
    return out;
  }

  /**
   * Shrinks every array a load filled to exactly what it holds: most documents in a space are never
   * written to, and the first write grows only the arrays it touches.
   */
  #trim(): void {
    this.#resizeOps(this.#count);
    this.#idCtr.forEach((counters, actor) => {
      const length = this.#idLength[actor];
      this.#idCtr[actor] = resize(counters, length, (size) => new Uint32Array(size));
      this.#idOp[actor] = resize(this.#idOp[actor], length, (size) => new Int32Array(size));
    });
    for (const object of this.#objects.values()) {
      if (object.type !== 'map') {
        object.elems = resize(object.elems, object.length, (size) => new Int32Array(size));
      }
    }
  }

  //
  // Changes.
  //

  /** Applies a change's ops in order; they must reference only ops the model already holds. */
  applyChange(change: Change): void {
    change.ops.forEach((op, index) => this.applyOp(`${change.startOp + index}@${change.actor}`, op));
    this.registerChange(change);
  }

  /** Records a change's place in the history, so clocks can be computed from heads that name it. */
  registerChange(change: Omit<Change, 'ops'> & { ops: readonly unknown[] }): void {
    this.#changes.add({
      hash: change.hash,
      actor: this.#actorOf(change.actor),
      seq: change.seq,
      startOp: change.startOp,
      maxOp: change.startOp + change.ops.length - 1,
      deps: change.deps,
      time: change.time,
      message: change.message,
    });
  }

  hasChange(hash: string): boolean {
    return this.#changes.find(hash) >= 0;
  }

  #index(hash: string, what = 'change'): number {
    const index = this.#changes.find(hash);
    if (index < 0) {
      throw new RangeError(what === 'heads' ? `Unknown heads: ${hash}` : `Unknown change ${hash}`);
    }
    return index;
  }

  /** A change as `A.decodeChange` gives it, rebuilt from the ops; it encodes to the bytes that carry its hash. */
  changeOf(hash: string): Change {
    const row = this.#changes.row(this.#index(hash));
    return {
      actor: this.#actors[row.actor],
      seq: row.seq,
      startOp: row.startOp,
      time: row.time,
      message: row.message,
      deps: row.deps,
      hash,
      ops: this.#opsOf(row.actor, row.startOp, row.maxOp),
    };
  }

  #opsOf(actor: number, startOp: number, maxOp: number): DecodedOp[] {
    const ops: DecodedOp[] = [];
    for (let counter = startOp; counter <= maxOp; counter++) {
      const op = this.#lookup(actor, counter);
      if (op < 0) {
        throw new Error(`Missing op ${counter}@${this.#actors[actor]}`);
      }
      const action = this.#flags[op] & ACTION_MASK;
      const obj = this.#obj[op];
      const key = this.#key[op];
      const datatype = this.#datatype(op);
      ops.push({
        action: ACTIONS[action],
        obj: this.#objIdOf(obj),
        ...(this.#objects.get(obj)?.type === 'map'
          ? { key: this.#keys[key] }
          : { elemId: key < 0 ? '_head' : this.#keyOf(key) }),
        ...(this.#flags[op] & INSERT ? { insert: true } : {}),
        ...(action === SET && datatype !== undefined ? { datatype } : {}),
        ...(action === SET || action === INC ? { value: this.#rawValue(op) } : {}),
        pred: this.#predsOf(op).map((pred) => this.#keyOf(pred)),
      });
    }
    return ops;
  }

  /** The hashes of the changes `heads` reach, in causal order. */
  changesIn(heads: readonly string[]): string[] {
    const clock = this.#changes.clockOf(heads.map((head) => this.#index(head, 'heads')));
    const out: string[] = [];
    for (const index of this.#changes.live()) {
      const maxOp = this.#changes.maxOpOf(index);
      if (maxOp < this.#changes.startOpOf(index) || maxOp <= (clock.get(this.#changes.actorOf(index)) ?? 0)) {
        out.push(this.#changes.hashOf(index));
      }
    }
    return out;
  }

  changeMeta(hash: string): ChangeInfo | undefined {
    const index = this.#changes.find(hash);
    if (index < 0) {
      return undefined;
    }
    const { hash: _hash, actor, ...row } = this.#changes.row(index);
    return { ...row, actor: this.#actors[actor] };
  }

  /** Every change hash the model knows, confirmed or not, in causal order. */
  changeHashes(): string[] {
    return [...this.#changes.live()].map((index) => this.#changes.hashOf(index));
  }

  /** The changes nothing depends on: the version that holds every change the model knows. */
  heads(): string[] {
    return this.#changes.heads();
  }

  /** Applies one op with its id. */
  applyOp(key: string, op: DecodedOp): void {
    const [counter, actor] = parseId(key);
    const obj = op.obj === '_root' ? ROOT : this.#require(op.obj, 'object');
    const container = this.#objects.get(obj);
    if (!container) {
      throw new Error(`Unknown object ${op.obj}`);
    }
    const action = ACTION_CODES.get(op.action);
    if (action === undefined) {
      throw new Error(`Unknown action ${op.action}`);
    }
    const index = this.#newOp(counter, this.#actorOf(actor), obj, action, op.insert ?? false);
    this.#setValue(index, action, op.value, op.datatype);
    if (container.type === 'map') {
      this.#key[index] = this.#intern(op.key ?? '');
    } else if (op.elemId !== undefined && op.elemId !== '_head') {
      this.#key[index] = this.#require(op.elemId, 'element');
    }
    for (const pred of op.pred) {
      this.#link(this.#require(pred, 'pred'), index);
    }
    this.#indexId(index, true);
    this.#place(index, container, true);
  }

  /** Puts an op in its object, `container`: at its key, in its sequence, or on its element. */
  #place(op: number, container: ObjectInfo, reorder: boolean): void {
    const flags = this.#flags[op];
    if ((flags & ACTION_MASK) === DEL) {
      return;
    }
    if (container.type === 'map') {
      const values = container.keys.get(this.#key[op]);
      if (values) {
        values.push(op);
      } else {
        container.keys.set(this.#key[op], [op]);
      }
    } else if (!(flags & INSERT)) {
      const elem = this.#key[op];
      if (elem < 0) {
        throw new Error('A sequence op names no element');
      }
      const later = this.#later.get(elem);
      if (later) {
        later.push(op);
      } else {
        this.#later.set(elem, [op]);
        this.#flags[elem] |= HAS_LATER;
      }
    } else {
      let position = container.length;
      if (reorder) {
        const ref = this.#key[op];
        position = ref < 0 ? 0 : this.#positionOf(container, ref) + 1;
        // RGA: move past every following element with a greater id, stop at the first smaller one.
        while (position < container.length && this.#compare(container.elems[position], op) > 0) {
          position++;
        }
      }
      if (container.length === container.elems.length) {
        container.elems = resize(container.elems, room(container.length + 1), (length) => new Int32Array(length));
      }
      container.elems.copyWithin(position + 1, position, container.length);
      container.elems[position] = op;
      container.length++;
    }
  }

  #positionOf(container: SeqObject, elem: number): number {
    const position = container.elems.subarray(0, container.length).lastIndexOf(elem);
    if (position < 0) {
      throw new Error(`Unknown element ${this.#keyOf(elem)}`);
    }
    return position;
  }

  /** Takes the ops of these changes back out, as if they had never been applied. */
  remove(changes: readonly Change[]): void {
    const removed = new Set<number>();
    for (const change of changes) {
      const actor = this.#actorIndex.get(change.actor);
      change.ops.forEach((_op, index) => {
        const op = actor === undefined ? -1 : this.#lookup(actor, change.startOp + index);
        if (op >= 0) {
          removed.add(op);
        }
      });
    }
    const sequences = new Set<SeqObject>();
    for (const op of removed) {
      for (const pred of this.#predsOf(op)) {
        this.#unlinkSucc(pred, op);
      }
      const flags = this.#flags[op];
      const container = this.#objects.get(this.#obj[op]);
      if ((flags & ACTION_MASK) !== DEL && container) {
        if (container.type === 'map') {
          const kept = (container.keys.get(this.#key[op]) ?? []).filter((value) => value !== op);
          if (kept.length > 0) {
            container.keys.set(this.#key[op], kept);
          } else {
            container.keys.delete(this.#key[op]);
          }
        } else if (flags & INSERT) {
          sequences.add(container);
        } else {
          const elem = this.#key[op];
          const kept = (this.#later.get(elem) ?? []).filter((value) => value !== op);
          if (kept.length > 0) {
            this.#later.set(elem, kept);
          } else {
            this.#later.delete(elem);
            this.#flags[elem] &= ~HAS_LATER;
          }
        }
      }
      this.#objects.delete(op);
      this.#flags[op] |= REMOVED;
      const actor = this.#act[op];
      const length = this.#idLength[actor];
      const at = bisect(this.#idCtr[actor], length, this.#ctr[op]);
      this.#idCtr[actor].copyWithin(at, at + 1, length);
      this.#idOp[actor].copyWithin(at, at + 1, length);
      this.#idLength[actor] = length - 1;
    }
    for (const sequence of sequences) {
      let kept = 0;
      for (let i = 0; i < sequence.length; i++) {
        if (!removed.has(sequence.elems[i])) {
          sequence.elems[kept++] = sequence.elems[i];
        }
      }
      sequence.length = kept;
    }
    this.#changes.remove(changes.map((change) => this.#changes.find(change.hash)).filter((index) => index >= 0));
    this.#maxOp = 0;
    this.#idCtr.forEach((counters, actor) => {
      const length = this.#idLength[actor];
      this.#maxOp = Math.max(this.#maxOp, length > 0 ? counters[length - 1] : 0);
    });
  }

  #unlinkSucc(op: number, succ: number): void {
    const more = this.#moreSucc.get(op) ?? [];
    if (this.#succ[op] === succ) {
      this.#succ[op] = more.shift() ?? -1;
    } else {
      const position = more.indexOf(succ);
      if (position >= 0) {
        more.splice(position, 1);
      }
    }
    if (more.length === 0) {
      this.#moreSucc.delete(op);
      this.#flags[op] &= ~MORE_SUCC;
    }
  }

  /** The clock of a version: the highest op counter per actor over the changes the heads reach. */
  clockOf(heads: readonly string[]): Map<string, number> {
    const byIndex = this.#changes.clockOf(heads.map((head) => this.#index(head, 'heads')));
    return new Map([...byIndex].map(([actor, maxOp]) => [this.#actors[actor], maxOp]));
  }

  /** Whether `hash` is in the history of `heads`. */
  reaches(heads: readonly string[], hash: string): boolean {
    const index = this.#changes.find(hash);
    return (
      index >= 0 &&
      this.#changes.maxOpOf(index) <= (this.clockOf(heads).get(this.#actors[this.#changes.actorOf(index)]) ?? 0)
    );
  }

  //
  // Reads at a version.
  //

  #alive(op: number, limits: Uint32Array): boolean {
    if (this.#ctr[op] > limits[this.#act[op]]) {
      return false;
    }
    const first = this.#succ[op];
    if (first < 0) {
      return true;
    }
    if (this.#ctr[first] <= limits[this.#act[first]]) {
      return false;
    }
    if (!(this.#flags[op] & MORE_SUCC)) {
      return true;
    }
    return !(this.#moreSucc.get(op) ?? []).some((succ) => this.#ctr[succ] <= limits[this.#act[succ]]);
  }

  /** The values of `values` alive at `limits`, the winner first. */
  #visible(values: readonly number[], limits: Uint32Array): number[] {
    return values.filter((op) => this.#alive(op, limits)).sort((left, right) => this.#compare(right, left));
  }

  /** An element's values: the insert op, then what was written to the element after it. */
  #elementValues(elem: number): number[] {
    return this.#flags[elem] & HAS_LATER ? [elem, ...(this.#later.get(elem) ?? [])] : [elem];
  }

  /** An element's winning value at `limits`, or -1 if it has none. */
  #winner(elem: number, limits: Uint32Array): number {
    let best = this.#alive(elem, limits) ? elem : -1;
    if (this.#flags[elem] & HAS_LATER) {
      for (const value of this.#later.get(elem) ?? []) {
        if (this.#alive(value, limits) && (best < 0 || this.#compare(value, best) > 0)) {
          best = value;
        }
      }
    }
    return best;
  }

  /** The UTF-16 length of an element's winning value, which a text position counts in. */
  #width(winner: number): number {
    if (this.#kind(winner) === CHAR) {
      return this.#val[winner] > 0xffff ? 2 : 1;
    }
    return String(this.#rawValue(winner)).length;
  }

  #value(op: number, limits: Uint32Array, inText: boolean): unknown {
    const object = isMake(this.#flags[op] & ACTION_MASK) ? this.#objects.get(op) : undefined;
    if (object) {
      return this.#materialize(object, limits);
    }
    const value = this.#rawValue(op);
    if (this.#datatype(op) === 'timestamp') {
      return new Date(Number(value));
    }
    if (typeof value === 'string' && !inText) {
      return immutableString(value);
    }
    // A copy, so a reader cannot change the model's own bytes.
    if (value instanceof Uint8Array) {
      return new Uint8Array(value);
    }
    return value;
  }

  #materialize(container: ObjectInfo, limits: Uint32Array): unknown {
    if (container.type === 'map') {
      const out: Record<string, unknown> = {};
      for (const [key, values] of container.keys) {
        const [winner] = this.#visible(values, limits);
        if (winner !== undefined) {
          out[this.#keys[key]] = this.#value(winner, limits, false);
        }
      }
      return out;
    }
    if (container.type === 'text') {
      return this.#text(container, limits);
    }
    const items: unknown[] = [];
    for (let i = 0; i < container.length; i++) {
      const winner = this.#winner(container.elems[i], limits);
      if (winner >= 0) {
        items.push(this.#value(winner, limits, false));
      }
    }
    return items;
  }

  /** A text's string at `limits`, built from UTF-16 units in one buffer rather than a string per character. */
  #text(container: SeqObject, limits: Uint32Array): string {
    let units = new Uint16Array(container.length * 2 + 16);
    let length = 0;
    for (let i = 0; i < container.length; i++) {
      const winner = this.#winner(container.elems[i], limits);
      if (winner < 0) {
        continue;
      }
      if (this.#kind(winner) === CHAR) {
        const point = this.#val[winner];
        if (point > 0xffff) {
          units[length++] = 0xd800 + ((point - 0x10000) >> 10);
          units[length++] = 0xdc00 + ((point - 0x10000) & 0x3ff);
        } else {
          units[length++] = point;
        }
      } else {
        const text = String(this.#rawValue(winner));
        if (length + text.length > units.length) {
          units = resize(units, (length + text.length) * 2, (size) => new Uint16Array(size));
        }
        for (let unit = 0; unit < text.length; unit++) {
          units[length++] = text.charCodeAt(unit);
        }
      }
    }
    return UTF16.decode(units.subarray(0, length));
  }

  /** The object as Automerge's `toJS` gives it at `clock`. */
  materialize(objId = '_root', clock: Clock): unknown {
    return this.#materialize(this.#object(objId), this.#limits(clock));
  }

  #object(objId: string): ObjectInfo {
    const container = this.#objects.get(objId === '_root' ? ROOT : this.#find(objId));
    if (!container) {
      throw new RangeError(`Unknown object ${objId}`);
    }
    return container;
  }

  typeOf(objId: string): 'map' | 'list' | 'text' {
    return this.#object(objId).type;
  }

  /** The element at visible `index` of a sequence at `limits`, or -1. */
  #elemAt(container: SeqObject, index: number, limits: Uint32Array): number {
    let seen = 0;
    for (let i = 0; i < container.length; i++) {
      if (this.#winner(container.elems[i], limits) >= 0) {
        if (seen === index) {
          return container.elems[i];
        }
        seen++;
      }
    }
    return -1;
  }

  #slot(container: ObjectInfo, prop: string | number, limits: Uint32Array): number[] {
    if (container.type === 'map') {
      const key = this.#keyIndex.get(String(prop));
      return key === undefined ? [] : (container.keys.get(key) ?? []);
    }
    const elem = this.#elemAt(container, Number(prop), limits);
    return elem >= 0 ? this.#elementValues(elem) : [];
  }

  /** The object id `path` reaches at `clock`. */
  objectAt(path: readonly (string | number)[], clock: Clock): string | undefined {
    const limits = this.#limits(clock);
    let container = this.#object('_root');
    let objId = '_root';
    for (const prop of path) {
      const [winner] = this.#visible(this.#slot(container, prop, limits), limits);
      const child = winner === undefined ? undefined : this.#objects.get(winner);
      if (winner === undefined || !child) {
        return undefined;
      }
      container = child;
      objId = this.#keyOf(winner);
    }
    return objId;
  }

  /** The values a write to `prop` would overwrite at `clock`, which it names as `pred`. */
  currentValueIds(objId: string, prop: string | number, clock: Clock): string[] {
    const limits = this.#limits(clock);
    return this.#visible(this.#slot(this.#object(objId), prop, limits), limits).map((op) => this.#keyOf(op));
  }

  visibleElements(objId: string, clock: Clock): Elem[] {
    const container = this.#object(objId);
    if (container.type === 'map') {
      throw new TypeError('A map has no elements');
    }
    const limits = this.#limits(clock);
    const out: Elem[] = [];
    for (let i = 0; i < container.length; i++) {
      const elem = container.elems[i];
      if (this.#winner(elem, limits) >= 0) {
        out.push({ key: this.#keyOf(elem), op: elem });
      }
    }
    return out;
  }

  /** The visible value ids of the element `elemKey` at `clock`, or undefined if `clock` lacks it. */
  elementValueIdsOf(objId: string, elemKey: string, clock: Clock): string[] | undefined {
    const elem = this.#find(elemKey);
    const limits = this.#limits(clock);
    if (
      elem < 0 ||
      !(this.#flags[elem] & INSERT) ||
      this.#objIdOf(this.#obj[elem]) !== objId ||
      this.#ctr[elem] > limits[this.#act[elem]]
    ) {
      return undefined;
    }
    return this.#visible(this.#elementValues(elem), limits).map((op) => this.#keyOf(op));
  }

  /** The visible value ids of an element at `clock`. */
  elementValueIds(elem: Elem, clock: Clock): string[] {
    return this.#visible(this.#elementValues(elem.op), this.#limits(clock)).map((op) => this.#keyOf(op));
  }

  /** The element holding UTF-16 unit `position` of a text at `clock`, where it starts and its width. */
  textElementAt(
    objId: string,
    position: number,
    clock: Clock,
  ): { elem: Elem; start: number; width: number } | undefined {
    const container = this.#object(objId);
    if (container.type === 'map') {
      throw new TypeError(`${objId} is a map`);
    }
    const limits = this.#limits(clock);
    let offset = 0;
    for (let i = 0; i < container.length; i++) {
      const elem = container.elems[i];
      const winner = this.#winner(elem, limits);
      if (winner < 0) {
        continue;
      }
      const width = this.#width(winner);
      if (position < offset + width) {
        return { elem: { key: this.#keyOf(elem), op: elem }, start: offset, width };
      }
      offset += width;
    }
    return undefined;
  }

  /** Automerge's `getConflicts` for a map key or list index at `clock`. */
  conflicts(objId: string, prop: string | number, clock: Clock): Record<string, unknown> | undefined {
    const limits = this.#limits(clock);
    const visible = this.#visible(this.#slot(this.#object(objId), prop, limits), limits);
    if (visible.length < 2) {
      return undefined;
    }
    // Automerge lists concurrent values in op id order, the winner last.
    return Object.fromEntries(visible.reverse().map((op) => [this.#keyOf(op), this.#value(op, limits, false)]));
  }

  /** Automerge's `getCursor` on a text: the id of the character at `position`. */
  cursorAt(objId: string, position: number, clock: Clock, move: 'before' | 'after' = 'after'): string {
    if (position < 0) {
      return 's';
    }
    const found = this.textElementAt(objId, position, clock);
    if (!found) {
      return 'e';
    }
    return move === 'before' ? `-${found.elem.key}` : found.elem.key;
  }

  /** Automerge's `getCursorPosition`, including characters deleted since. */
  cursorPosition(objId: string, cursor: string, clock: Clock): number {
    const container = this.#object(objId);
    if (container.type === 'map') {
      throw new TypeError(`${objId} is a map`);
    }
    const limits = this.#limits(clock);
    const widthOf = (elem: number): number => {
      const winner = this.#winner(elem, limits);
      return winner < 0 ? 0 : this.#width(winner);
    };
    /** The width of the elements before `target`, or of all of them when it is not one. */
    const offsetOf = (target: number): number => {
      let offset = 0;
      for (let i = 0; i < container.length && container.elems[i] !== target; i++) {
        offset += widthOf(container.elems[i]);
      }
      return offset;
    };
    if (cursor === 's') {
      return 0;
    }
    if (cursor === 'e') {
      return offsetOf(-1);
    }
    const before = cursor.startsWith('-');
    const target = this.#find(before ? cursor.slice(1) : cursor);
    if (
      target < 0 ||
      !(this.#flags[target] & INSERT) ||
      this.#objects.get(this.#obj[target]) !== container ||
      this.#ctr[target] > limits[this.#act[target]]
    ) {
      throw new RangeError(`Cannot getCursorPosition: cursor ${cursor} is invalid`);
    }
    if (widthOf(target) > 0 || !before) {
      return offsetOf(target);
    }
    // A deleted character resolves 'before' to the nearest visible character on its chain of origins.
    for (let origin = this.#key[target]; origin >= 0; origin = this.#key[origin]) {
      if (widthOf(origin) > 0) {
        return offsetOf(origin);
      }
    }
    return 0;
  }

  /**
   * The objects whose state can differ between two versions, with their ancestors: an op's visibility
   * changes only when it or one of its successors lies between the versions, and both are in its object.
   * -1 stands for the root.
   */
  #touched(before: Uint32Array, after: Uint32Array): Set<number> {
    const touched = new Set<number>();
    this.#idCtr.forEach((counters, actor) => {
      const low = Math.min(before[actor], after[actor]);
      const high = Math.max(before[actor], after[actor]);
      if (low === high) {
        return;
      }
      const length = this.#idLength[actor];
      for (let position = bisect(counters, length, low + 1); position < length; position++) {
        if (counters[position] > high) {
          break;
        }
        for (let owner = this.#obj[this.#idOp[actor][position]]; !touched.has(owner); owner = this.#obj[owner]) {
          touched.add(owner);
          if (owner === ROOT) {
            break;
          }
        }
      }
    });
    return touched;
  }

  /**
   * Automerge-shaped patches that turn the document at `before` into the document at `after`. Only the
   * objects ops between the two versions touch are walked, so nearby versions diff in time proportional
   * to the objects they changed.
   */
  diff(beforeClock: Clock, afterClock: Clock): Patch[] {
    const before = this.#limits(beforeClock);
    const after = this.#limits(afterClock);
    const touched = this.#touched(before, after);
    if (touched.size === 0) {
      return [];
    }
    const buckets = new Map<number, Patch[]>();
    const empty = (op: number, inText: boolean): unknown => {
      const action = this.#flags[op] & ACTION_MASK;
      return action === MAKE_MAP || action === MAKE_TABLE
        ? {}
        : action === MAKE_LIST
          ? []
          : action === MAKE_TEXT
            ? ''
            : this.#value(op, after, inText);
    };
    const walk = (owner: number, container: ObjectInfo, path: (string | number)[], existed: boolean): void => {
      const patches: Patch[] = [];
      buckets.set(owner, patches);
      const children: [number, (string | number)[], boolean][] = [];
      if (container.type === 'map') {
        const keys = [...container.keys.keys()].sort((left, right) =>
          this.#keys[left] < this.#keys[right] ? -1 : this.#keys[left] > this.#keys[right] ? 1 : 0,
        );
        for (const key of keys) {
          const name = this.#keys[key];
          const values = container.keys.get(key) ?? [];
          const wasVisible = existed ? this.#visible(values, before) : [];
          const isVisible = this.#visible(values, after);
          const [was] = wasVisible;
          const [is] = isVisible;
          if (is === undefined) {
            if (was !== undefined) {
              patches.push({ action: 'del', path: [...path, name] });
            }
          } else if (was === is) {
            // The value stayed but gained a concurrent one.
            if (isVisible.length > 1 && wasVisible.length < 2) {
              patches.push({ action: 'conflict', path: [...path, name] });
            }
            if (this.#objects.has(is)) {
              children.push([is, [...path, name], true]);
            }
          } else {
            patches.push({
              action: 'put',
              path: [...path, name],
              value: empty(is, false),
              ...(isVisible.length > 1 ? { conflict: true } : {}),
            });
            if (this.#objects.has(is)) {
              children.push([is, [...path, name], false]);
            }
          }
        }
      } else {
        const text = container.type === 'text';
        let index = 0;
        let pending: Patch | undefined;
        const flush = () => {
          if (pending) {
            patches.push(pending);
          }
          pending = undefined;
        };
        for (let i = 0; i < container.length; i++) {
          const elem = container.elems[i];
          const was = existed ? this.#winner(elem, before) : -1;
          const is = this.#winner(elem, after);
          const later = (this.#flags[elem] & HAS_LATER) !== 0;
          if (was >= 0 && is >= 0) {
            flush();
            // Only an element written after its insert can hold concurrent values.
            const isCount = later ? this.#visible(this.#elementValues(elem), after).length : 1;
            if (was !== is) {
              patches.push({
                action: 'put',
                path: [...path, index],
                value: empty(is, text),
                ...(isCount > 1 ? { conflict: true } : {}),
              });
              if (this.#objects.has(is)) {
                children.push([is, [...path, index], false]);
              }
            } else {
              const wasCount = later ? this.#visible(this.#elementValues(elem), before).length : 1;
              if (isCount > 1 && wasCount < 2) {
                patches.push({ action: 'conflict', path: [...path, index] });
              }
              if (this.#objects.has(is)) {
                children.push([is, [...path, index], true]);
              }
            }
            index += text ? this.#width(is) : 1;
          } else if (is >= 0) {
            if (text) {
              if (pending?.action !== 'splice') {
                flush();
                pending = { action: 'splice', path: [...path, index], value: '' };
              }
              const value = String(this.#rawValue(is));
              pending.value += value;
              index += value.length;
            } else {
              if (pending?.action !== 'insert') {
                flush();
                pending = { action: 'insert', path: [...path, index], values: [] };
              }
              pending.values.push(empty(is, false));
              if (this.#objects.has(is)) {
                children.push([is, [...path, index], false]);
              }
              index += 1;
            }
          } else if (was >= 0) {
            if (pending?.action !== 'del') {
              flush();
              pending = { action: 'del', path: [...path, index], length: 0 };
            }
            pending.length = (pending.length ?? 0) + (text ? this.#width(was) : 1);
          }
        }
        flush();
      }
      for (const [child, childPath, childExisted] of children) {
        const object = this.#objects.get(child);
        // An object that existed at both versions changed only if an op between them touched it.
        if (object && (!childExisted || touched.has(child))) {
          walk(child, object, childPath, childExisted);
        }
      }
    };
    walk(ROOT, this.#object('_root'), [], true);
    // Automerge emits each object's patches in turn: the root first, then by object id.
    const objects = [...buckets.keys()]
      .filter((owner) => owner !== ROOT)
      .sort((left, right) => this.#compare(left, right));
    return [buckets.get(ROOT) ?? [], ...objects.map((owner) => buckets.get(owner) ?? [])]
      .flat()
      .map((patch) => (patch.action === 'del' && patch.length === 1 ? { action: 'del', path: patch.path } : patch));
  }

  /** Whether `clock` contains the element `elemKey` of an object. */
  hasElement(objId: string, elemKey: string, clock: Clock): boolean {
    const elem = this.#find(elemKey);
    return (
      elem >= 0 &&
      (this.#flags[elem] & INSERT) !== 0 &&
      this.#objIdOf(this.#obj[elem]) === objId &&
      this.#ctr[elem] <= (clock.get(this.#actors[this.#act[elem]]) ?? 0)
    );
  }

  hasObject(objId: string, clock: Clock): boolean {
    if (objId === '_root') {
      return true;
    }
    const op = this.#find(objId);
    return op >= 0 && this.#objects.has(op) && this.#ctr[op] <= (clock.get(this.#actors[this.#act[op]]) ?? 0);
  }
}
