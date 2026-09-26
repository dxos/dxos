//
// Copyright 2026 DXOS.org
//

import { ChangeTable } from './changes.ts';
import { encodeChange } from './encode.ts';
import { type Change, type Clock, type DecodedOp, parseId } from './ids.ts';
import { immutableString } from './immutable-string.ts';
import { readSaved } from './reader.ts';

export type Patch =
  | { action: 'put'; path: (string | number)[]; value: unknown; conflict?: boolean }
  | { action: 'conflict'; path: (string | number)[] }
  | { action: 'del'; path: (string | number)[]; length?: number }
  | { action: 'insert'; path: (string | number)[]; values: unknown[] }
  | { action: 'splice'; path: (string | number)[]; value: string };

/**
 * One op. Ids are not stored as strings: an op points at the ops it relates to, and its id is its
 * counter with an index into the model's actors. Every field is always set, so all ops share one shape.
 */
type Rec = {
  counter: number;
  actor: number;
  /** The op that made the containing object; undefined for the root. */
  obj: Rec | undefined;
  action: string;
  value: unknown;
  datatype: string | undefined;
  /** A map op's key. */
  prop: string | undefined;
  /** A sequence op's element: the one an insert follows (undefined for the head), or the one it writes. */
  ref: Rec | undefined;
  insert: boolean;
  /** The ops it overwrote, which its change names; with `succ`, enough to write its change again. */
  pred: Rec[] | undefined;
  succ: Rec[] | undefined;
  /** What a make op made. */
  contents: MapObject | SeqObject | undefined;
  /** An insert op's element: the values written to it after the insert. */
  later: Rec[] | undefined;
};

type MapObject = { type: 'map'; keys: Map<string, Rec[]> };

/** A sequence's elements are their insert ops, in document order. */
type SeqObject = { type: 'list' | 'text'; elems: Rec[] };

/** An element as the model hands it out. */
export type Elem = { readonly key: string; readonly rec: Rec };

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

const OBJECT_TYPES: Record<string, 'map' | 'list' | 'text'> = {
  makeMap: 'map',
  makeTable: 'map',
  makeList: 'list',
  makeText: 'text',
};

const ACTIONS = new Map(
  ['makeMap', 'set', 'makeList', 'del', 'makeText', 'inc', 'makeTable'].map((name) => [name, name]),
);

/** Most text values are one character; sharing them keeps a long text from holding a string per op. */
const SHORT = new Map<string, string>();
const share = (value: unknown): unknown => {
  if (typeof value !== 'string' || value.length > 2) {
    return value;
  }
  const shared = SHORT.get(value);
  if (shared !== undefined) {
    return shared;
  }
  SHORT.set(value, value);
  return value;
};

const newRec = (counter: number, actor: number, obj: Rec | undefined, action: string): Rec => ({
  counter,
  actor,
  obj,
  action: ACTIONS.get(action) ?? action,
  value: undefined,
  datatype: undefined,
  prop: undefined,
  ref: undefined,
  insert: false,
  pred: undefined,
  succ: undefined,
  contents: undefined,
  later: undefined,
});

const push = <T>(list: T[] | undefined, value: T): T[] => {
  if (list) {
    list.push(value);
    return list;
  }
  return [value];
};

/**
 * A whole Automerge document as plain JS: every op with the ops that overwrote it, so the state at
 * any version, cursors, conflicts and diffs come out of one structure.
 */
export class Model {
  readonly #root: MapObject = { type: 'map', keys: new Map() };
  readonly #actors: string[] = [];
  readonly #actorIndex = new Map<string, number>();
  /** Each actor's ops, sorted by counter: an array slot costs far less than a map entry. */
  readonly #ops: Rec[][] = [];
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
      this.#ops.push([]);
    }
    return index;
  }

  #keyOf(rec: Rec): string {
    return `${rec.counter}@${this.#actors[rec.actor]}`;
  }

  #find(id: string): Rec | undefined {
    const [counter, actor] = parseId(id);
    const index = this.#actorIndex.get(actor);
    return index === undefined ? undefined : this.#at(index, counter);
  }

  /** The op of `actor` with `counter`, by bisection. */
  #at(actor: number, counter: number): Rec | undefined {
    const ops = this.#ops[actor];
    const position = this.#position(ops, counter);
    return ops[position]?.counter === counter ? ops[position] : undefined;
  }

  /** Where `counter` is, or would go, in a sorted list of ops. */
  #position(ops: readonly Rec[], counter: number): number {
    let low = 0;
    let high = ops.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (ops[middle].counter < counter) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return low;
  }

  #get(id: string, what: string): Rec {
    const rec = this.#find(id);
    if (!rec) {
      throw new Error(`Unknown ${what} ${id}`);
    }
    return rec;
  }

  /** Keeps an op; `sorted: false` appends, for a load that sorts once at the end. */
  #store(rec: Rec, sorted = true): void {
    const ops = this.#ops[rec.actor];
    if (!sorted || ops.length === 0 || ops[ops.length - 1].counter < rec.counter) {
      ops.push(rec);
    } else {
      ops.splice(this.#position(ops, rec.counter), 0, rec);
    }
    this.#maxOp = Math.max(this.#maxOp, rec.counter);
  }

  /** Lamport order: counter first, then actor. */
  #compare(left: Rec, right: Rec): number {
    if (left.counter !== right.counter) {
      return left.counter - right.counter;
    }
    const leftActor = this.#actors[left.actor];
    const rightActor = this.#actors[right.actor];
    return leftActor < rightActor ? -1 : leftActor > rightActor ? 1 : 0;
  }

  /** A clock as a limit per actor index, which the visibility checks read. */
  #limits(clock: Clock): number[] {
    return this.#actors.map((actor) => clock.get(actor) ?? 0);
  }

  /**
   * A document read from Automerge's saved bytes. Given no change hashes, it computes each by encoding
   * the change again, and checks them against the saved heads as Automerge's own load does.
   */
  static fromSaved(bytes: Uint8Array, hashes?: readonly string[]): Model {
    const model = new Model();
    const { actors, heads, changes, ops } = readSaved(bytes);
    const actorIndex = actors.map((actor) => model.#actorOf(actor));
    // Ops are appended as they are read and sorted once they all are, so lookups go through a map until then.
    const loading = new Map<number, Rec>();
    const loadKey = (actor: number, counter: number) => counter * 65536 + actor;
    const find = ([actor, counter]: readonly [number, number]): Rec | undefined =>
      loading.get(loadKey(actorIndex[actor], counter));
    const successors: [Rec, (readonly [number, number])[]][] = [];
    for (const op of ops) {
      const obj = op.obj ? find(op.obj) : undefined;
      if (op.obj && !obj?.contents) {
        throw new Error('A saved op names an object that is not made before it');
      }
      const container = obj ? obj.contents : model.#root;
      const rec = newRec(op.id[1], actorIndex[op.id[0]], obj, op.action);
      rec.value = share(op.value);
      rec.datatype = op.datatype;
      rec.insert = op.insert;
      if (container?.type === 'map') {
        rec.prop = typeof op.key === 'string' ? op.key : undefined;
      } else if (op.key !== null && typeof op.key !== 'string') {
        rec.ref = find(op.key);
      }
      if (op.succ.length > 0) {
        successors.push([rec, op.succ]);
      }
      loading.set(loadKey(rec.actor, rec.counter), rec);
      // Saved documents store a sequence in document order.
      model.#place(rec, false);
    }
    // A saved document keeps no delete ops: a successor that is not an op is one, and each op's preds
    // are the ops that name it as a successor.
    for (const [rec, succ] of successors) {
      for (const [actor, counter] of succ) {
        let target = find([actor, counter]);
        if (!target) {
          target = newRec(counter, actorIndex[actor], rec.obj, 'del');
          target.prop = rec.prop;
          target.ref = rec.prop === undefined ? (rec.insert ? rec : rec.ref) : undefined;
          loading.set(loadKey(target.actor, counter), target);
          model.#store(target, false);
        }
        target.pred = push(target.pred, rec);
        rec.succ = push(rec.succ, target);
      }
    }
    for (const ops of model.#ops) {
      ops.sort((left, right) => left.counter - right.counter);
    }
    // A change's ops are its actor's ops above the previous change's highest op.
    const counters = model.#ops.map((ops) => ops.map((rec) => rec.counter));
    const bySeq = changes
      .map((change, index) => ({ change, index }))
      .sort((left, right) => left.change.actor - right.change.actor || left.change.seq - right.change.seq);
    const startOps = new Map<number, number>();
    // Each actor's changes come in seq order and its counters ascending, so one pass per actor finds them.
    const next = new Map<number, number>();
    for (const { change, index } of bySeq) {
      const list = counters[actorIndex[change.actor]] ?? [];
      let position = next.get(change.actor) ?? 0;
      const first = list[position];
      while (position < list.length && list[position] <= change.maxOp) {
        position++;
      }
      next.set(change.actor, position);
      startOps.set(index, first !== undefined && first <= change.maxOp ? first : change.maxOp + 1);
    }
    // Saved changes come in causal order, so each change's deps are hashed before it.
    const known: string[] = [];
    changes.forEach((change, index) => {
      const actor = actorIndex[change.actor];
      const startOp = startOps.get(index) ?? change.maxOp + 1;
      const deps = change.deps.map((dep) => known[dep]);
      const hash =
        hashes?.[index] ??
        encodeChange({
          actor: actors[change.actor],
          seq: change.seq,
          startOp,
          time: change.time,
          message: change.message,
          deps,
          ops: model.#opsOf(actor, startOp, change.maxOp),
        }).hash;
      known.push(hash);
      model.#changes.add({
        hash,
        actor,
        seq: change.seq,
        startOp,
        maxOp: change.maxOp,
        time: change.time,
        message: change.message,
        deps,
      });
    });
    if (!hashes && model.#changes.heads().join() !== [...heads].sort().join()) {
      throw new Error('The saved heads do not match the changes read');
    }
    model.#changes.trim();
    return model;
  }

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
      const rec = this.#at(actor, counter);
      if (!rec) {
        throw new Error(`Missing op ${counter}@${this.#actors[actor]}`);
      }
      const scalar = rec.action === 'set' || rec.action === 'inc';
      ops.push({
        action: rec.action,
        obj: rec.obj ? this.#keyOf(rec.obj) : '_root',
        ...(rec.prop !== undefined ? { key: rec.prop } : { elemId: rec.ref ? this.#keyOf(rec.ref) : '_head' }),
        ...(rec.insert ? { insert: true } : {}),
        ...(rec.action === 'set' && rec.datatype !== undefined ? { datatype: rec.datatype } : {}),
        ...(scalar ? { value: rec.value } : {}),
        pred: (rec.pred ?? []).map((pred) => this.#keyOf(pred)),
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
    const obj = op.obj === '_root' ? undefined : this.#get(op.obj, 'object');
    const container = obj ? obj.contents : this.#root;
    if (!container) {
      throw new Error(`Unknown object ${op.obj}`);
    }
    const rec = newRec(counter, this.#actorOf(actor), obj, op.action);
    rec.value = share(op.value);
    rec.datatype = op.datatype;
    rec.insert = op.insert ?? false;
    if (container.type === 'map') {
      rec.prop = op.key;
    } else if (op.elemId !== undefined && op.elemId !== '_head') {
      rec.ref = this.#get(op.elemId, 'element');
    }
    if (op.pred.length > 0) {
      rec.pred = op.pred.map((pred) => this.#get(pred, 'pred'));
      for (const target of rec.pred) {
        target.succ = push(target.succ, rec);
      }
    }
    this.#place(rec, true);
  }

  /** Stores an op and puts it in its object: at its key, in its sequence, or on its element. */
  #place(rec: Rec, reorder: boolean): void {
    this.#store(rec, reorder);
    const childType = OBJECT_TYPES[rec.action];
    if (childType) {
      rec.contents = childType === 'map' ? { type: 'map', keys: new Map() } : { type: childType, elems: [] };
    }
    if (rec.action === 'del') {
      return;
    }
    const container = rec.obj ? rec.obj.contents : this.#root;
    if (!container) {
      throw new Error('An op names an object that is not one');
    }
    if (container.type === 'map') {
      const key = rec.prop ?? '';
      const values = container.keys.get(key);
      if (values) {
        values.push(rec);
      } else {
        container.keys.set(key, [rec]);
      }
    } else if (!rec.insert) {
      if (!rec.ref) {
        throw new Error('A sequence op names no element');
      }
      rec.ref.later = push(rec.ref.later, rec);
    } else if (!reorder) {
      container.elems.push(rec);
    } else {
      let position = rec.ref ? container.elems.indexOf(rec.ref) + 1 : 0;
      // RGA: move past every following element with a greater id, stop at the first smaller one.
      while (position < container.elems.length && this.#compare(container.elems[position], rec) > 0) {
        position++;
      }
      container.elems.splice(position, 0, rec);
    }
  }

  /** Takes the ops of these changes back out, as if they had never been applied. */
  remove(changes: readonly Change[]): void {
    const removed = new Set<Rec>();
    for (const change of changes) {
      const actor = this.#actorIndex.get(change.actor);
      change.ops.forEach((_op, index) => {
        const rec = actor === undefined ? undefined : this.#at(actor, change.startOp + index);
        if (rec) {
          removed.add(rec);
        }
      });
    }
    const sequences = new Set<SeqObject>();
    for (const rec of removed) {
      for (const pred of rec.pred ?? []) {
        pred.succ = pred.succ?.filter((succ) => succ !== rec);
      }
      const container = rec.obj ? rec.obj.contents : this.#root;
      if (rec.action !== 'del' && container) {
        if (container.type === 'map') {
          const kept = (container.keys.get(rec.prop ?? '') ?? []).filter((value) => value !== rec);
          if (kept.length > 0) {
            container.keys.set(rec.prop ?? '', kept);
          } else {
            container.keys.delete(rec.prop ?? '');
          }
        } else if (rec.insert) {
          sequences.add(container);
        } else if (rec.ref) {
          rec.ref.later = rec.ref.later?.filter((value) => value !== rec);
        }
      }
      const ops = this.#ops[rec.actor];
      ops.splice(this.#position(ops, rec.counter), 1);
    }
    for (const sequence of sequences) {
      sequence.elems = sequence.elems.filter((elem) => !removed.has(elem));
    }
    this.#changes.remove(changes.map((change) => this.#changes.find(change.hash)).filter((index) => index >= 0));
    this.#maxOp = 0;
    for (const ops of this.#ops) {
      this.#maxOp = Math.max(this.#maxOp, ops[ops.length - 1]?.counter ?? 0);
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

  #alive(rec: Rec, limits: number[]): boolean {
    return (
      rec.counter <= (limits[rec.actor] ?? 0) && !rec.succ?.some((succ) => succ.counter <= (limits[succ.actor] ?? 0))
    );
  }

  /** The values of `values` alive at `limits`, the winner first. */
  #visible(values: readonly Rec[], limits: number[]): Rec[] {
    return values.filter((rec) => this.#alive(rec, limits)).sort((left, right) => this.#compare(right, left));
  }

  /** An element's values: the insert op, then what was written to the element after it. */
  #elementValues(elem: Rec): Rec[] {
    return elem.later ? [elem, ...elem.later] : [elem];
  }

  /** An element's winning value at `limits`, or undefined if it has none. */
  #winner(elem: Rec, limits: number[]): Rec | undefined {
    let best = this.#alive(elem, limits) ? elem : undefined;
    for (const value of elem.later ?? []) {
      if (this.#alive(value, limits) && (!best || this.#compare(value, best) > 0)) {
        best = value;
      }
    }
    return best;
  }

  #value(rec: Rec, limits: number[], inText: boolean): unknown {
    if (rec.contents) {
      return this.#materialize(rec.contents, limits);
    }
    if (rec.datatype === 'timestamp') {
      return new Date(Number(rec.value));
    }
    if (typeof rec.value === 'string' && !inText) {
      return immutableString(rec.value);
    }
    // A copy, so a reader cannot change the model's own bytes.
    if (rec.value instanceof Uint8Array) {
      return new Uint8Array(rec.value);
    }
    return rec.value;
  }

  #materialize(container: MapObject | SeqObject, limits: number[]): unknown {
    if (container.type === 'map') {
      const out: Record<string, unknown> = {};
      for (const [key, values] of container.keys) {
        const [winner] = this.#visible(values, limits);
        if (winner) {
          out[key] = this.#value(winner, limits, false);
        }
      }
      return out;
    }
    const items: unknown[] = [];
    for (const elem of container.elems) {
      const winner = this.#winner(elem, limits);
      if (winner) {
        items.push(this.#value(winner, limits, container.type === 'text'));
      }
    }
    return container.type === 'text' ? items.join('') : items;
  }

  /** The object as Automerge's `toJS` gives it at `clock`. */
  materialize(objId = '_root', clock: Clock): unknown {
    return this.#materialize(this.#object(objId), this.#limits(clock));
  }

  #object(objId: string): MapObject | SeqObject {
    const container = objId === '_root' ? this.#root : this.#find(objId)?.contents;
    if (!container) {
      throw new RangeError(`Unknown object ${objId}`);
    }
    return container;
  }

  typeOf(objId: string): 'map' | 'list' | 'text' {
    return this.#object(objId).type;
  }

  #elems(container: MapObject | SeqObject, limits: number[]): Rec[] {
    if (container.type === 'map') {
      throw new TypeError('A map has no elements');
    }
    return container.elems.filter((elem) => this.#winner(elem, limits) !== undefined);
  }

  #slot(container: MapObject | SeqObject, prop: string | number, limits: number[]): Rec[] {
    if (container.type === 'map') {
      return container.keys.get(String(prop)) ?? [];
    }
    const elem = this.#elems(container, limits)[Number(prop)];
    return elem ? this.#elementValues(elem) : [];
  }

  /** The object id `path` reaches at `clock`. */
  objectAt(path: readonly (string | number)[], clock: Clock): string | undefined {
    const limits = this.#limits(clock);
    let container: MapObject | SeqObject = this.#root;
    let objId = '_root';
    for (const prop of path) {
      const [winner] = this.#visible(this.#slot(container, prop, limits), limits);
      if (!winner?.contents) {
        return undefined;
      }
      container = winner.contents;
      objId = this.#keyOf(winner);
    }
    return objId;
  }

  /** The values a write to `prop` would overwrite at `clock`, which it names as `pred`. */
  currentValueIds(objId: string, prop: string | number, clock: Clock): string[] {
    const limits = this.#limits(clock);
    return this.#visible(this.#slot(this.#object(objId), prop, limits), limits).map((rec) => this.#keyOf(rec));
  }

  #elem(rec: Rec): Elem {
    return { key: this.#keyOf(rec), rec };
  }

  visibleElements(objId: string, clock: Clock): Elem[] {
    return this.#elems(this.#object(objId), this.#limits(clock)).map((rec) => this.#elem(rec));
  }

  /** The visible value ids of the element `elemKey` at `clock`, or undefined if `clock` lacks it. */
  elementValueIdsOf(objId: string, elemKey: string, clock: Clock): string[] | undefined {
    const elem = this.#find(elemKey);
    const limits = this.#limits(clock);
    if (
      !elem?.insert ||
      (elem.obj ? this.#keyOf(elem.obj) : '_root') !== objId ||
      elem.counter > (limits[elem.actor] ?? 0)
    ) {
      return undefined;
    }
    return this.#visible(this.#elementValues(elem), limits).map((rec) => this.#keyOf(rec));
  }

  /** The visible value ids of an element at `clock`. */
  elementValueIds(elem: Elem, clock: Clock): string[] {
    const limits = this.#limits(clock);
    return this.#visible(this.#elementValues(elem.rec), limits).map((rec) => this.#keyOf(rec));
  }

  /** The element holding UTF-16 unit `position` of a text at `clock`, where it starts and its width. */
  textElementAt(
    objId: string,
    position: number,
    clock: Clock,
  ): { elem: Elem; start: number; width: number } | undefined {
    const container = this.#object(objId);
    const limits = this.#limits(clock);
    if (container.type === 'map') {
      throw new TypeError(`${objId} is a map`);
    }
    let offset = 0;
    for (const elem of container.elems) {
      const winner = this.#winner(elem, limits);
      if (!winner) {
        continue;
      }
      const width = String(winner.value).length;
      if (position < offset + width) {
        return { elem: this.#elem(elem), start: offset, width };
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
    return Object.fromEntries(visible.reverse().map((rec) => [this.#keyOf(rec), this.#value(rec, limits, false)]));
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
    const widthOf = (elem: Rec): number => {
      const winner = this.#winner(elem, limits);
      return winner ? String(winner.value).length : 0;
    };
    if (cursor === 's') {
      return 0;
    }
    if (cursor === 'e') {
      return container.elems.reduce((sum, elem) => sum + widthOf(elem), 0);
    }
    const before = cursor.startsWith('-');
    const target = this.#find(before ? cursor.slice(1) : cursor);
    if (!target?.insert || target.obj?.contents !== container || target.counter > (limits[target.actor] ?? 0)) {
      throw new RangeError(`Cannot getCursorPosition: cursor ${cursor} is invalid`);
    }
    const offsets = new Map<Rec, number>();
    let offset = 0;
    for (const elem of container.elems) {
      offsets.set(elem, offset);
      offset += widthOf(elem);
    }
    if (widthOf(target) > 0 || !before) {
      return offsets.get(target) ?? 0;
    }
    // A deleted character resolves 'before' to the nearest visible character on its chain of origins.
    for (let origin = target.ref; origin; origin = origin.ref) {
      if (widthOf(origin) > 0) {
        return offsets.get(origin) ?? 0;
      }
    }
    return 0;
  }

  /**
   * The objects whose state can differ between two versions, with their ancestors: an op's visibility
   * changes only when it or one of its successors lies between the versions, and both are in its object.
   * `undefined` stands for the root.
   */
  #touched(before: number[], after: number[]): Set<Rec | undefined> {
    const touched = new Set<Rec | undefined>();
    this.#ops.forEach((ops, actor) => {
      const low = Math.min(before[actor] ?? 0, after[actor] ?? 0);
      const high = Math.max(before[actor] ?? 0, after[actor] ?? 0);
      for (let position = this.#position(ops, low + 1); position < ops.length; position++) {
        const rec = ops[position];
        if (rec.counter > high) {
          break;
        }
        for (let owner = rec.obj; !touched.has(owner); owner = owner?.obj) {
          touched.add(owner);
          if (owner === undefined) {
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
    const buckets = new Map<Rec | undefined, Patch[]>();
    const empty = (rec: Rec, inText: boolean): unknown => {
      const type = OBJECT_TYPES[rec.action];
      return type === 'map' ? {} : type === 'list' ? [] : type === 'text' ? '' : this.#value(rec, after, inText);
    };
    const walk = (
      owner: Rec | undefined,
      container: MapObject | SeqObject,
      path: (string | number)[],
      existed: boolean,
    ): void => {
      const patches: Patch[] = [];
      buckets.set(owner, patches);
      const children: [Rec, (string | number)[], boolean][] = [];
      if (container.type === 'map') {
        for (const key of [...container.keys.keys()].sort()) {
          const values = container.keys.get(key) ?? [];
          const wasVisible = existed ? this.#visible(values, before) : [];
          const isVisible = this.#visible(values, after);
          const [was] = wasVisible;
          const [is] = isVisible;
          if (!is) {
            if (was) {
              patches.push({ action: 'del', path: [...path, key] });
            }
          } else if (was === is) {
            // The value stayed but gained a concurrent one.
            if (isVisible.length > 1 && wasVisible.length < 2) {
              patches.push({ action: 'conflict', path: [...path, key] });
            }
            if (is.contents) {
              children.push([is, [...path, key], true]);
            }
          } else {
            patches.push({
              action: 'put',
              path: [...path, key],
              value: empty(is, false),
              ...(isVisible.length > 1 ? { conflict: true } : {}),
            });
            if (is.contents) {
              children.push([is, [...path, key], false]);
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
        for (const elem of container.elems) {
          const was = existed ? this.#winner(elem, before) : undefined;
          const is = this.#winner(elem, after);
          if (was && is) {
            flush();
            // Only an element written after its insert can hold concurrent values.
            const isCount = elem.later ? this.#visible(this.#elementValues(elem), after).length : 1;
            if (was !== is) {
              patches.push({
                action: 'put',
                path: [...path, index],
                value: empty(is, text),
                ...(isCount > 1 ? { conflict: true } : {}),
              });
              if (is.contents) {
                children.push([is, [...path, index], false]);
              }
            } else {
              const wasCount = elem.later ? this.#visible(this.#elementValues(elem), before).length : 1;
              if (isCount > 1 && wasCount < 2) {
                patches.push({ action: 'conflict', path: [...path, index] });
              }
              if (is.contents) {
                children.push([is, [...path, index], true]);
              }
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
              if (is.contents) {
                children.push([is, [...path, index], false]);
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
        // An object that existed at both versions changed only if an op between them touched it.
        if (child.contents && (!childExisted || touched.has(child))) {
          walk(child, child.contents, childPath, childExisted);
        }
      }
    };
    walk(undefined, this.#root, [], true);
    // Automerge emits each object's patches in turn: the root first, then by object id.
    const objects = [...buckets.keys()]
      .filter((owner): owner is Rec => owner !== undefined)
      .sort((left, right) => this.#compare(left, right));
    return [buckets.get(undefined) ?? [], ...objects.map((owner) => buckets.get(owner) ?? [])]
      .flat()
      .map((patch) => (patch.action === 'del' && patch.length === 1 ? { action: 'del', path: patch.path } : patch));
  }

  /** Whether `clock` contains the element `elemKey` of an object. */
  hasElement(objId: string, elemKey: string, clock: Clock): boolean {
    const elem = this.#find(elemKey);
    return (
      elem !== undefined &&
      elem.insert &&
      (elem.obj ? this.#keyOf(elem.obj) : '_root') === objId &&
      elem.counter <= (clock.get(this.#actors[elem.actor]) ?? 0)
    );
  }

  hasObject(objId: string, clock: Clock): boolean {
    if (objId === '_root') {
      return true;
    }
    const rec = this.#find(objId);
    return rec?.contents !== undefined && rec.counter <= (clock.get(this.#actors[rec.actor]) ?? 0);
  }
}
