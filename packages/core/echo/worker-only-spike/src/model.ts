//
// Copyright 2026 DXOS.org
//

import { ImmutableString } from '@automerge/automerge/slim';

import { readSaved } from './reader.ts';

/** An Automerge op id: counter, then actor. */
export type OpId = readonly [counter: number, actor: string];

/** An op as `A.decodeChange` returns it, which is also what `A.encodeChange` takes. */
export type DecodedOp = {
  action: string;
  obj: string;
  key?: string;
  elemId?: string;
  insert?: boolean;
  value?: unknown;
  datatype?: string;
  pred: string[];
};

/** A change as `A.decodeChange` returns it. */
export type Change = {
  actor: string;
  seq: number;
  startOp: number;
  time: number;
  message: string | null;
  deps: string[];
  hash: string;
  ops: DecodedOp[];
};

export type Clock = ReadonlyMap<string, number>;

export type Patch =
  | { action: 'put'; path: (string | number)[]; value: unknown }
  | { action: 'del'; path: (string | number)[]; length?: number }
  | { action: 'insert'; path: (string | number)[]; values: unknown[] }
  | { action: 'splice'; path: (string | number)[]; value: string };

type Rec = {
  key: string;
  id: OpId;
  obj: string;
  action: string;
  value: unknown;
  datatype?: string;
  /** The map key the op writes, or the element it inserts after or writes to. */
  prop?: string;
  elemId?: string;
  insert: boolean;
  /** The ops it overwrote, which its change names; with `succ`, enough to write its change again. */
  pred: string[];
  succ: OpId[];
};

type Elem = { id: OpId; key: string; origin: string; values: Rec[] };

type MapObject = { type: 'map'; keys: Map<string, Rec[]> };

type SeqObject = { type: 'list' | 'text'; elems: Elem[]; index: Map<string, Elem> };

type ChangeMeta = {
  actor: string;
  seq: number;
  startOp: number;
  maxOp: number;
  deps: string[];
  time: number;
  message: string | null;
};

const OBJECT_TYPES: Record<string, 'map' | 'list' | 'text'> = {
  makeMap: 'map',
  makeTable: 'map',
  makeList: 'list',
  makeText: 'text',
};

export const parseId = (key: string): OpId => {
  const at = key.indexOf('@');
  return [Number(key.slice(0, at)), key.slice(at + 1)];
};

export const formatId = ([counter, actor]: OpId): string => `${counter}@${actor}`;

/** Lamport order: counter first, then actor. */
export const compareIds = (left: OpId, right: OpId): number =>
  left[0] !== right[0] ? left[0] - right[0] : left[1] < right[1] ? -1 : left[1] > right[1] ? 1 : 0;

export const inClock = (clock: Clock, [counter, actor]: OpId): boolean => counter <= (clock.get(actor) ?? 0);

/**
 * A whole Automerge document as plain JS: every op with the ops that overwrote it, so the state at
 * any version, cursors, conflicts and diffs come out of one structure.
 */
export class Model {
  readonly #objects = new Map<string, MapObject | SeqObject>([['_root', { type: 'map', keys: new Map() }]]);
  readonly #ops = new Map<string, Rec>();
  readonly #changes = new Map<string, ChangeMeta>();
  #maxOp = 0;

  /** The highest op counter the model holds. */
  get maxOp(): number {
    return this.#maxOp;
  }

  /** A document read from Automerge's saved bytes and its change hashes in stored order. */
  static fromSaved(bytes: Uint8Array, hashes: readonly string[]): Model {
    const model = new Model();
    const { actors, changes, ops } = readSaved(bytes);
    const id = ([actor, counter]: readonly [number, number]): OpId => [counter, actors[actor]];
    const sequences = new Set<string>();
    for (const op of ops) {
      const obj = op.obj ? formatId(id(op.obj)) : '_root';
      const key = op.key === null ? undefined : typeof op.key === 'string' ? op.key : formatId(id(op.key));
      const inSequence = obj !== '_root' && sequences.has(obj);
      const rec: Rec = {
        key: formatId(id(op.id)),
        id: id(op.id),
        obj,
        action: op.action,
        value: op.value,
        datatype: op.datatype === 'str' ? undefined : op.datatype,
        ...(inSequence ? { elemId: key ?? '_head' } : { prop: key }),
        insert: op.insert,
        pred: [],
        succ: op.succ.map(id),
      };
      if (op.action === 'makeList' || op.action === 'makeText') {
        sequences.add(rec.key);
      }
      model.#addRec(rec, key, op.insert);
    }
    // A saved document keeps no delete ops: a successor that is not an op is one, and each op's preds
    // are the ops that name it as a successor.
    for (const rec of [...model.#ops.values()]) {
      for (const succ of rec.succ) {
        const succKey = formatId(succ);
        const existing = model.#ops.get(succKey);
        if (existing) {
          existing.pred.push(rec.key);
          continue;
        }
        model.#ops.set(succKey, {
          key: succKey,
          id: succ,
          obj: rec.obj,
          action: 'del',
          value: undefined,
          ...(rec.prop !== undefined ? { prop: rec.prop } : { elemId: rec.insert ? rec.key : rec.elemId }),
          insert: false,
          pred: [rec.key],
          succ: [],
        });
        model.#maxOp = Math.max(model.#maxOp, succ[0]);
      }
    }
    // A change's ops are its actor's ops above the previous change's highest op.
    const counters = new Map<string, number[]>();
    for (const rec of model.#ops.values()) {
      counters.set(rec.id[1], [...(counters.get(rec.id[1]) ?? []), rec.id[0]]);
    }
    for (const list of counters.values()) {
      list.sort((left, right) => left - right);
    }
    const previousMax = new Map<number, number>();
    const bySeq = changes
      .map((change, index) => ({ change, index }))
      .sort((left, right) => left.change.actor - right.change.actor || left.change.seq - right.change.seq);
    const startOps = new Map<number, number>();
    for (const { change, index } of bySeq) {
      const after = previousMax.get(change.actor) ?? 0;
      const first = (counters.get(actors[change.actor]) ?? []).find((counter) => counter > after);
      startOps.set(index, first !== undefined && first <= change.maxOp ? first : change.maxOp + 1);
      previousMax.set(change.actor, change.maxOp);
    }
    changes.forEach((change, index) => {
      model.#changes.set(hashes[index], {
        actor: actors[change.actor],
        seq: change.seq,
        startOp: startOps.get(index) ?? change.maxOp + 1,
        maxOp: change.maxOp,
        deps: change.deps.map((dep) => hashes[dep]),
        time: change.time,
        message: change.message,
      });
    });
    return model;
  }

  /** Applies a change's ops in order; they must reference only ops the model already holds. */
  applyChange(change: Change): void {
    change.ops.forEach((op, index) => this.applyOp(formatId([change.startOp + index, change.actor]), op));
    this.registerChange(change);
  }

  /** Records a change's place in the history, so clocks can be computed from heads that name it. */
  registerChange(change: Omit<Change, 'ops'> & { ops: readonly unknown[] }): void {
    this.#changes.set(change.hash, {
      actor: change.actor,
      seq: change.seq,
      startOp: change.startOp,
      maxOp: change.startOp + change.ops.length - 1,
      deps: change.deps,
      time: change.time,
      message: change.message,
    });
  }

  hasChange(hash: string): boolean {
    return this.#changes.has(hash);
  }

  /** A change as `A.decodeChange` gives it, rebuilt from the ops; it encodes to the bytes that carry its hash. */
  changeOf(hash: string): Change {
    const meta = this.#changes.get(hash);
    if (!meta) {
      throw new RangeError(`Unknown change ${hash}`);
    }
    const ops: DecodedOp[] = [];
    for (let counter = meta.startOp; counter <= meta.maxOp; counter++) {
      const rec = this.#ops.get(formatId([counter, meta.actor]));
      if (!rec) {
        throw new Error(`Missing op ${counter}@${meta.actor} of ${hash}`);
      }
      const scalar = rec.action === 'set' || rec.action === 'inc';
      ops.push({
        action: rec.action,
        obj: rec.obj,
        ...(rec.prop !== undefined ? { key: rec.prop } : { elemId: rec.elemId }),
        ...(rec.insert ? { insert: true } : {}),
        ...(scalar && rec.datatype !== undefined ? { datatype: rec.datatype } : {}),
        ...(scalar ? { value: rec.value } : {}),
        pred: [...rec.pred],
      });
    }
    return {
      actor: meta.actor,
      seq: meta.seq,
      startOp: meta.startOp,
      time: meta.time,
      message: meta.message,
      deps: [...meta.deps],
      hash,
      ops,
    };
  }

  changeMeta(hash: string): ChangeMeta | undefined {
    return this.#changes.get(hash);
  }

  /** Every change hash the model knows, confirmed or not. */
  changeHashes(): string[] {
    return [...this.#changes.keys()];
  }

  /** Applies one op with its id. */
  applyOp(key: string, op: DecodedOp): void {
    const obj = this.#objects.get(op.obj);
    if (!obj) {
      throw new Error(`Unknown object ${op.obj}`);
    }
    const rec: Rec = {
      key,
      id: parseId(key),
      obj: op.obj,
      action: op.action,
      value: op.value,
      datatype: op.datatype,
      ...(op.key !== undefined ? { prop: op.key } : { elemId: op.elemId }),
      insert: op.insert ?? false,
      pred: [...op.pred],
      succ: [],
    };
    for (const pred of op.pred) {
      const target = this.#ops.get(pred);
      if (!target) {
        throw new Error(`Unknown pred ${pred}`);
      }
      target.succ.push(rec.id);
    }
    if (op.action === 'del') {
      this.#ops.set(key, rec);
      this.#maxOp = Math.max(this.#maxOp, rec.id[0]);
      return;
    }
    this.#addRec(rec, obj.type === 'map' ? op.key : op.elemId, op.insert ?? false, true);
  }

  #addRec(rec: Rec, key: string | undefined, insert: boolean, place = false): void {
    const childType = OBJECT_TYPES[rec.action];
    if (childType) {
      this.#objects.set(
        rec.key,
        childType === 'map' ? { type: 'map', keys: new Map() } : { type: childType, elems: [], index: new Map() },
      );
    }
    this.#ops.set(rec.key, rec);
    this.#maxOp = Math.max(this.#maxOp, rec.id[0]);
    if (rec.action === 'del') {
      return;
    }
    const obj = this.#objects.get(rec.obj);
    if (!obj) {
      throw new Error(`Unknown object ${rec.obj}`);
    }
    if (obj.type === 'map') {
      const values = obj.keys.get(key!) ?? [];
      values.push(rec);
      obj.keys.set(key!, values);
    } else if (insert) {
      const elem: Elem = { id: rec.id, key: rec.key, origin: key ?? '_head', values: [rec] };
      if (!place) {
        // Saved documents store a sequence in document order.
        obj.elems.push(elem);
      } else {
        let position = 0;
        if (key !== undefined && key !== '_head') {
          const origin = obj.index.get(key);
          if (!origin) {
            throw new Error(`Unknown element ${key}`);
          }
          position = obj.elems.indexOf(origin) + 1;
        }
        // RGA: move past every following element with a greater id, stop at the first smaller one.
        while (position < obj.elems.length && compareIds(obj.elems[position].id, rec.id) > 0) {
          position++;
        }
        obj.elems.splice(position, 0, elem);
      }
      obj.index.set(rec.key, elem);
    } else {
      const elem = obj.index.get(key!);
      if (!elem) {
        throw new Error(`Unknown element ${key}`);
      }
      elem.values.push(rec);
    }
  }

  /** Takes the ops of these changes back out, as if they had never been applied. */
  remove(changes: readonly Change[]): void {
    const removed = new Set<string>();
    for (const change of changes) {
      change.ops.forEach((_op, index) => removed.add(formatId([change.startOp + index, change.actor])));
    }
    for (const [key, obj] of this.#objects) {
      if (removed.has(key)) {
        this.#objects.delete(key);
      } else if (obj.type === 'map') {
        for (const [prop, values] of obj.keys) {
          const kept = values.filter((rec) => !removed.has(rec.key));
          if (kept.length > 0) {
            obj.keys.set(prop, kept);
          } else {
            obj.keys.delete(prop);
          }
        }
      } else {
        obj.elems = obj.elems.filter((elem) => !removed.has(elem.key));
        for (const elemKey of [...obj.index.keys()]) {
          if (removed.has(elemKey)) {
            obj.index.delete(elemKey);
          }
        }
        for (const elem of obj.elems) {
          elem.values = elem.values.filter((rec) => !removed.has(rec.key));
        }
      }
    }
    for (const [key, rec] of this.#ops) {
      if (removed.has(key)) {
        this.#ops.delete(key);
      } else {
        rec.succ = rec.succ.filter((id) => !removed.has(formatId(id)));
      }
    }
    for (const change of changes) {
      this.#changes.delete(change.hash);
    }
    this.#maxOp = 0;
    for (const rec of this.#ops.values()) {
      this.#maxOp = Math.max(this.#maxOp, rec.id[0]);
    }
  }

  /** The clock of a version: the highest op counter per actor over the changes the heads reach. */
  clockOf(heads: readonly string[]): Map<string, number> {
    const clock = new Map<string, number>();
    const stack = [...heads];
    const seen = new Set<string>();
    while (stack.length > 0) {
      const hash = stack.pop()!;
      if (seen.has(hash)) {
        continue;
      }
      seen.add(hash);
      const meta = this.#changes.get(hash);
      if (!meta) {
        throw new RangeError(`Unknown heads: ${hash}`);
      }
      clock.set(meta.actor, Math.max(clock.get(meta.actor) ?? 0, meta.maxOp));
      stack.push(...meta.deps);
    }
    return clock;
  }

  /** Whether `hash` is in the history of `heads`. */
  reaches(heads: readonly string[], hash: string): boolean {
    const meta = this.#changes.get(hash);
    return meta !== undefined && inClock(this.clockOf(heads), [meta.maxOp, meta.actor]);
  }

  #visible(values: readonly Rec[], clock: Clock): Rec[] {
    return values
      .filter((rec) => inClock(clock, rec.id) && !rec.succ.some((succ) => inClock(clock, succ)))
      .sort((left, right) => compareIds(right.id, left.id));
  }

  #value(rec: Rec, clock: Clock, inText: boolean): unknown {
    if (OBJECT_TYPES[rec.action]) {
      return this.materialize(rec.key, clock);
    }
    if (rec.datatype === 'timestamp') {
      return new Date(rec.value as number);
    }
    if (typeof rec.value === 'string' && !inText) {
      return new ImmutableString(rec.value);
    }
    return rec.value;
  }

  /** The object as Automerge's `toJS` gives it at `clock`. */
  materialize(objId = '_root', clock: Clock): unknown {
    const obj = this.#object(objId);
    if (obj.type === 'map') {
      const out: Record<string, unknown> = {};
      for (const [key, values] of obj.keys) {
        const [winner] = this.#visible(values, clock);
        if (winner) {
          out[key] = this.#value(winner, clock, false);
        }
      }
      return out;
    }
    const items: unknown[] = [];
    for (const elem of obj.elems) {
      const [winner] = this.#visible(elem.values, clock);
      if (winner) {
        items.push(this.#value(winner, clock, obj.type === 'text'));
      }
    }
    return obj.type === 'text' ? items.join('') : items;
  }

  #object(objId: string): MapObject | SeqObject {
    const obj = this.#objects.get(objId);
    if (!obj) {
      throw new RangeError(`Unknown object ${objId}`);
    }
    return obj;
  }

  typeOf(objId: string): 'map' | 'list' | 'text' {
    return this.#object(objId).type;
  }

  /** The object id `path` reaches at `clock`. */
  objectAt(path: readonly (string | number)[], clock: Clock): string | undefined {
    let objId = '_root';
    for (const prop of path) {
      const [winner] = this.#visible(this.#slot(objId, prop, clock), clock);
      if (!winner || !OBJECT_TYPES[winner.action]) {
        return undefined;
      }
      objId = winner.key;
    }
    return objId;
  }

  #slot(objId: string, prop: string | number, clock: Clock): Rec[] {
    const obj = this.#object(objId);
    if (obj.type === 'map') {
      return obj.keys.get(String(prop)) ?? [];
    }
    return this.visibleElements(objId, clock)[Number(prop)]?.values ?? [];
  }

  /** The values a write to `prop` would overwrite at `clock`, which it names as `pred`. */
  currentValueIds(objId: string, prop: string | number, clock: Clock): string[] {
    return this.#visible(this.#slot(objId, prop, clock), clock).map((rec) => rec.key);
  }

  visibleElements(objId: string, clock: Clock): Elem[] {
    const obj = this.#object(objId);
    if (obj.type === 'map') {
      throw new TypeError(`${objId} is a map`);
    }
    return obj.elems.filter((elem) => this.#visible(elem.values, clock).length > 0);
  }

  /** The visible value ids of the element `elemKey` at `clock`, or undefined if `clock` lacks it. */
  elementValueIdsOf(objId: string, elemKey: string, clock: Clock): string[] | undefined {
    const obj = this.#objects.get(objId);
    if (!obj || obj.type === 'map') {
      return undefined;
    }
    const elem = obj.index.get(elemKey);
    return elem && inClock(clock, elem.id) ? this.#visible(elem.values, clock).map((rec) => rec.key) : undefined;
  }

  /** The visible value ids of an element at `clock`. */
  elementValueIds(elem: Elem, clock: Clock): string[] {
    return this.#visible(elem.values, clock).map((rec) => rec.key);
  }

  /** The element holding UTF-16 unit `position` of a text at `clock`, where it starts and its width. */
  textElementAt(
    objId: string,
    position: number,
    clock: Clock,
  ): { elem: Elem; start: number; width: number } | undefined {
    let offset = 0;
    for (const elem of this.visibleElements(objId, clock)) {
      const width = String(this.#visible(elem.values, clock)[0].value).length;
      if (position < offset + width) {
        return { elem, start: offset, width };
      }
      offset += width;
    }
    return undefined;
  }

  /** Automerge's `getConflicts` for a map key or list index at `clock`. */
  conflicts(objId: string, prop: string | number, clock: Clock): Record<string, unknown> | undefined {
    const visible = this.#visible(this.#slot(objId, prop, clock), clock);
    if (visible.length < 2) {
      return undefined;
    }
    return Object.fromEntries(visible.map((rec) => [rec.key, this.#value(rec, clock, false)]));
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
    const obj = this.#object(objId);
    if (obj.type === 'map') {
      throw new TypeError(`${objId} is a map`);
    }
    const widthOf = (elem: Elem): number => {
      const [winner] = this.#visible(elem.values, clock);
      return winner ? String(winner.value).length : 0;
    };
    if (cursor === 's') {
      return 0;
    }
    if (cursor === 'e') {
      return obj.elems.reduce((sum, elem) => sum + widthOf(elem), 0);
    }
    const before = cursor.startsWith('-');
    const key = before ? cursor.slice(1) : cursor;
    const target = obj.index.get(key);
    if (!target || !inClock(clock, target.id)) {
      throw new RangeError(`Cannot getCursorPosition: cursor ${cursor} is invalid`);
    }
    const offsets = new Map<string, number>();
    let offset = 0;
    for (const elem of obj.elems) {
      offsets.set(elem.key, offset);
      offset += widthOf(elem);
    }
    if (widthOf(target) > 0 || !before) {
      return offsets.get(key)!;
    }
    // A deleted character resolves 'before' to the nearest visible character on its chain of origins.
    let origin = target.origin;
    while (origin !== '_head') {
      const elem = obj.index.get(origin)!;
      if (widthOf(elem) > 0) {
        return offsets.get(origin)!;
      }
      origin = elem.origin;
    }
    return 0;
  }

  /** Automerge-shaped patches that turn the document at `before` into the document at `after`. */
  diff(before: Clock, after: Clock): Patch[] {
    const buckets = new Map<string, Patch[]>();
    const empty = (rec: Rec, inText: boolean): unknown => {
      const type = OBJECT_TYPES[rec.action];
      return type === 'map' ? {} : type === 'list' ? [] : type === 'text' ? '' : this.#value(rec, after, inText);
    };
    const walk = (objId: string, path: (string | number)[], existed: boolean): void => {
      const obj = this.#object(objId);
      const patches: Patch[] = [];
      buckets.set(objId, patches);
      const children: [string, (string | number)[], boolean][] = [];
      if (obj.type === 'map') {
        for (const key of [...obj.keys.keys()].sort()) {
          const values = obj.keys.get(key)!;
          const [was] = existed ? this.#visible(values, before) : [];
          const [is] = this.#visible(values, after);
          if (!is) {
            if (was) {
              patches.push({ action: 'del', path: [...path, key] });
            }
          } else if (was && was.key === is.key) {
            if (OBJECT_TYPES[is.action]) {
              children.push([is.key, [...path, key], true]);
            }
          } else {
            patches.push({ action: 'put', path: [...path, key], value: empty(is, false) });
            if (OBJECT_TYPES[is.action]) {
              children.push([is.key, [...path, key], false]);
            }
          }
        }
      } else {
        const text = obj.type === 'text';
        let index = 0;
        let pending: Patch | undefined;
        const flush = () => {
          if (pending) {
            patches.push(pending);
          }
          pending = undefined;
        };
        for (const elem of obj.elems) {
          const [was] = existed ? this.#visible(elem.values, before) : [];
          const [is] = this.#visible(elem.values, after);
          if (was && is) {
            flush();
            if (was.key !== is.key) {
              patches.push({ action: 'put', path: [...path, index], value: empty(is, text) });
              if (OBJECT_TYPES[is.action]) {
                children.push([is.key, [...path, index], false]);
              }
            } else if (OBJECT_TYPES[is.action]) {
              children.push([is.key, [...path, index], true]);
            }
            index += text ? String(is.value).length : 1;
          } else if (is) {
            if (text) {
              if (pending?.action !== 'splice') {
                flush();
                pending = { action: 'splice', path: [...path, index], value: '' };
              }
              pending.value += String(is.value);
              index += String(is.value).length;
            } else {
              if (pending?.action !== 'insert') {
                flush();
                pending = { action: 'insert', path: [...path, index], values: [] };
              }
              pending.values.push(empty(is, false));
              if (OBJECT_TYPES[is.action]) {
                children.push([is.key, [...path, index], false]);
              }
              index += 1;
            }
          } else if (was) {
            if (pending?.action !== 'del') {
              flush();
              pending = { action: 'del', path: [...path, index], length: 0 };
            }
            pending.length = (pending.length ?? 0) + (text ? String(was.value).length : 1);
          }
        }
        flush();
      }
      for (const [child, childPath, childExisted] of children) {
        walk(child, childPath, childExisted);
      }
    };
    walk('_root', [], true);
    // Automerge emits each object's patches in turn: the root first, then by object id.
    const order = [...buckets.keys()].sort((left, right) =>
      left === '_root' ? -1 : right === '_root' ? 1 : compareIds(parseId(left), parseId(right)),
    );
    return order
      .flatMap((objId) => buckets.get(objId)!)
      .map((patch) => (patch.action === 'del' && patch.length === 1 ? { action: 'del', path: patch.path } : patch));
  }

  /** Every element and value op of an object that `clock` contains, for checks against a version. */
  hasElement(objId: string, elemKey: string, clock: Clock): boolean {
    const obj = this.#objects.get(objId);
    if (!obj || obj.type === 'map') {
      return false;
    }
    const elem = obj.index.get(elemKey);
    return elem !== undefined && inClock(clock, elem.id);
  }

  hasObject(objId: string, clock: Clock): boolean {
    return objId === '_root' || (this.#objects.has(objId) && inClock(clock, parseId(objId)));
  }
}
