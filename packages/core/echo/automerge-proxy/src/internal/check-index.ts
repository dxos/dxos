//
// Copyright 2026 DXOS.org
//

import { ChangeTable, room, savedOrderHashes } from './changes.ts';
import { IdIndex, savedStartOps } from './id-index.ts';
import { type Change, type Clock, type DecodedOp, parseId } from './ids.ts';
import { readSavedColumns } from './reader.ts';

// What the worker keeps to check a tab's change, instead of a second copy of the document: each op's
// object, its key or element, and its kind, found by id, plus the change table. Values stay in
// Automerge alone. The checks refuse every reference Automerge would reject or read differently from a
// tab's model: an object, element or pred that does not exist in the version the change names, or
// that sits in another object, key or element. A pred need not be the whole current value: omitting
// one makes a conflict, which Automerge and the model read alike.

const ACTIONS = ['makeMap', 'set', 'makeList', 'del', 'makeText', 'inc', 'makeTable'];
const ACTION_CODES = new Map(ACTIONS.map((name, code) => [name, code]));
const MAKE_MAP = 0;
const MAKE_LIST = 2;
const DEL = 3;
const MAKE_TEXT = 4;
const INC = 5;
const MAKE_TABLE = 6;

// An op's flags: its action and whether it inserts.
const ACTION_MASK = 0x7;
const INSERT = 0x8;

/** The root object, and the head of a sequence. */
const ROOT = -1;
/** What `#find` returns for an id it cannot see, kept apart from `ROOT`. */
const MISSING = -2;

const isMake = (action: number): boolean =>
  action === MAKE_MAP || action === MAKE_LIST || action === MAKE_TEXT || action === MAKE_TABLE;

const isMapMake = (action: number): boolean => action === MAKE_MAP || action === MAKE_TABLE;

/**
 * The version an op sees: `clock`, plus the ops of its own change before it, which are `actor`'s ids
 * from `start` up to but not including `next`. A clock alone cannot say this: the change's actor may
 * have ops the version lacks below `start`.
 */
type Seen = { clock: Clock; actor: string; start: number; next: number };

export class CheckIndex {
  readonly #actors: string[] = [];
  readonly #actorIndex = new Map<string, number>();
  #count = 0;
  /** The op that made the containing object, or -1 for the root. */
  #obj = new Int32Array(0);
  /** A map op's key as an index into `#keys`; a sequence op's element, or -1 for the head. */
  #key = new Int32Array(0);
  #flags = new Uint8Array(0);
  readonly #keys: string[] = [];
  readonly #keyIndex = new Map<string, number>();
  /** Every op but deletes, which nothing can name: a pred names a value and an element an insert. */
  readonly #ids = new IdIndex();
  readonly #changes = new ChangeTable();

  #actorOf(actor: string): number {
    let index = this.#actorIndex.get(actor);
    if (index === undefined) {
      index = this.#actors.length;
      this.#actors.push(actor);
      this.#actorIndex.set(actor, index);
      this.#ids.addActor();
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

  #resize(capacity: number): void {
    const obj = new Int32Array(capacity);
    const key = new Int32Array(capacity);
    const flags = new Uint8Array(capacity);
    obj.set(this.#obj.subarray(0, Math.min(this.#count, capacity)));
    key.set(this.#key.subarray(0, Math.min(this.#count, capacity)));
    flags.set(this.#flags.subarray(0, Math.min(this.#count, capacity)));
    this.#obj = obj;
    this.#key = key;
    this.#flags = flags;
  }

  #append(obj: number, key: number, flags: number): number {
    if (this.#count === this.#obj.length) {
      this.#resize(room(this.#count + 1));
    }
    const op = this.#count++;
    this.#obj[op] = obj;
    this.#key[op] = key;
    this.#flags[op] = flags;
    return op;
  }

  /**
   * The index of a saved document. `hashes` holds each change's hash in the snapshot layout (see
   * `hashesByActor`), which the worker has from Automerge.
   */
  static fromSaved(bytes: Uint8Array, hashes: Uint8Array): CheckIndex {
    const index = new CheckIndex();
    const { actors, heads, strings, ops, changes } = readSavedColumns(bytes);
    const actorIndex = actors.map((actor) => index.#actorOf(actor));
    const keyIndex = strings.map((key) => index.#intern(key));
    const count = ops.count;
    index.#resize(count);
    index.#count = count;
    for (let i = 0; i < count; i++) {
      index.#ids.append(actorIndex[ops.idActor[i]], ops.idCounter[i], i);
      index.#flags[i] = ops.action[i] | (ops.insert[i] === 1 ? INSERT : 0);
    }
    index.#ids.sort();
    const resolve = (actor: number, counter: number): number => {
      if (actor < 0) {
        return ROOT;
      }
      const op = index.#ids.lookup(actorIndex[actor], counter);
      if (op < 0) {
        throw new Error(`A saved op names an unknown op ${counter}@${actors[actor]}`);
      }
      return op;
    };
    for (let i = 0; i < count; i++) {
      const obj = resolve(ops.objActor[i], ops.objCounter[i]);
      if (obj !== ROOT && !isMake(index.#flags[obj] & ACTION_MASK)) {
        throw new Error('A saved op names an object that is not one');
      }
      index.#obj[i] = obj;
      index.#key[i] = index.#isMap(obj)
        ? (keyIndex[ops.keyString[i]] ?? index.#intern(''))
        : resolve(ops.keyActor[i], ops.keyCounter[i]);
    }

    // A saved document keeps no delete ops, only their ids as successors, which the change table needs
    // to find each change's first op; they are sorted in beside each actor's ops, then dropped.
    const deletes: number[][] = actors.map(() => []);
    for (let at = 0; at < ops.succActor.length; at++) {
      const actor = actorIndex[ops.succActor[at]];
      const counter = ops.succCounter[at];
      if (index.#ids.lookup(actor, counter) < 0) {
        deletes[actor].push(counter);
      }
    }
    const counters = actorIndex.map((actor) => {
      const own = index.#ids.countersOf(actor);
      const extra = [...new Set(deletes[actor])].sort((left, right) => left - right);
      if (extra.length === 0) {
        return own;
      }
      const merged = new Uint32Array(own.length + extra.length);
      for (let left = 0, right = 0, out = 0; out < merged.length; out++) {
        merged[out] =
          right >= extra.length || (left < own.length && own[left] < extra[right]) ? own[left++] : extra[right++];
      }
      return merged;
    });
    index.#changes.load(
      changes,
      actorIndex,
      savedStartOps(changes, counters),
      savedOrderHashes(changes, actors, hashes),
    );
    if (index.#changes.heads().join() !== [...heads].sort().join()) {
      throw new Error('The saved heads do not match the hashes given');
    }
    index.#ids.trim();
    return index;
  }

  #isMap(obj: number): boolean {
    return obj === ROOT || isMapMake(this.#flags[obj] & ACTION_MASK);
  }

  hasChange(hash: string): boolean {
    return this.#changes.find(hash) >= 0;
  }

  /** Every change's hash in the snapshot layout, for a tab opening the document. */
  snapshotHashes(): Uint8Array {
    return this.#changes.hashesByActor(this.#actors);
  }

  /** The clock of a version: the highest op counter per actor over the changes the heads reach. */
  clockOf(heads: readonly string[]): Map<string, number> {
    const indexes = heads.map((head) => {
      const index = this.#changes.find(head);
      if (index < 0) {
        throw new RangeError(`Unknown heads: ${head}`);
      }
      return index;
    });
    const byIndex = this.#changes.clockOf(indexes);
    return new Map([...byIndex].map(([actor, maxOp]) => [this.#actors[actor], maxOp]));
  }

  /** The highest op counter over `actor`'s changes, which the version its next change edits must reach. */
  #lastOpOf(actor: number): number {
    return this.#changes.clockOf(this.#changes.frontier()).get(actor) ?? 0;
  }

  /** The op an id names within what `seen` sees, or `MISSING`. */
  #find(id: string, seen: Seen): number {
    const [counter, actor] = parseId(id);
    const index = this.#actorIndex.get(actor);
    if (index === undefined || !Number.isInteger(counter)) {
      return MISSING;
    }
    const own = actor === seen.actor && counter >= seen.start;
    if (own ? counter >= seen.next : counter > (seen.clock.get(actor) ?? 0)) {
      return MISSING;
    }
    const op = this.#ids.lookup(index, counter);
    return op < 0 ? MISSING : op;
  }

  /** Why `op` cannot be applied in what `seen` sees, or undefined if it can. */
  #refusal(op: DecodedOp, seen: Seen): string | undefined {
    const action = ACTION_CODES.get(op.action);
    if (action === undefined) {
      return `unknown action ${op.action}`;
    }
    if (action === INC) {
      // The tab's model has no counters, so it would read an increment as a new value.
      return 'a tab writes no counters';
    }
    const obj = op.obj === '_root' ? ROOT : this.#find(op.obj, seen);
    if (obj === MISSING || (obj !== ROOT && !isMake(this.#flags[obj] & ACTION_MASK))) {
      return `unknown object ${op.obj}`;
    }
    const preds: number[] = [];
    for (const pred of op.pred) {
      const found = this.#find(pred, seen);
      if (found === MISSING || this.#obj[found] !== obj || (this.#flags[found] & ACTION_MASK) === INC) {
        return `pred ${pred} is not a value in ${op.obj}`;
      }
      preds.push(found);
    }
    if (action === DEL && preds.length === 0) {
      return 'a delete names no pred';
    }
    if (this.#isMap(obj)) {
      if (op.key === undefined || op.elemId !== undefined || op.insert) {
        return `map op without a key in ${op.obj}`;
      }
      const key = this.#keyIndex.get(op.key);
      if (preds.some((pred) => this.#key[pred] !== key)) {
        return `pred ${op.pred} is not a value of ${op.key}`;
      }
      return undefined;
    }
    if (op.elemId === undefined || op.key !== undefined) {
      return `sequence op without an element in ${op.obj}`;
    }
    const elem = op.elemId === '_head' ? ROOT : this.#find(op.elemId, seen);
    if (elem === MISSING || (elem !== ROOT && (!(this.#flags[elem] & INSERT) || this.#obj[elem] !== obj))) {
      return `unknown element ${op.elemId}`;
    }
    if (op.insert) {
      if (action === DEL) {
        return 'a delete cannot insert';
      }
      return preds.length > 0 ? 'insert with a pred' : undefined;
    }
    if (elem === ROOT) {
      return 'an update names the head';
    }
    // An element's values are its insert and the ops written to it since.
    if (preds.some((pred) => pred !== elem && (this.#flags[pred] & INSERT || this.#key[pred] !== elem))) {
      return `pred ${op.pred} is not a value of ${op.elemId}`;
    }
    return undefined;
  }

  /** Adds an op a check passed or a peer's change carries; a delete leaves nothing to name. */
  #add(op: DecodedOp, actor: number, counter: number, seen: Seen): void {
    const action = ACTION_CODES.get(op.action);
    if (action === undefined) {
      throw new Error(`Unknown action ${op.action}`);
    }
    if (action === DEL) {
      return;
    }
    const obj = op.obj === '_root' ? ROOT : this.#find(op.obj, seen);
    if (obj === MISSING) {
      throw new Error(`An op names an object the index lacks: ${op.obj}`);
    }
    const key = this.#isMap(obj)
      ? this.#intern(op.key ?? '')
      : op.elemId === undefined || op.elemId === '_head'
        ? ROOT
        : this.#find(op.elemId, seen);
    if (key === MISSING) {
      throw new Error(`An op names an element the index lacks: ${op.elemId}`);
    }
    this.#ids.insert(actor, counter, this.#append(obj, key, action | (op.insert ? INSERT : 0)));
  }

  /**
   * Checks a tab's change against the version its deps name, whose clock is `baseClock`: it must follow
   * its actor's previous change, its ids must be new, and each op, seeing the ones before it, must pass.
   * The change is added if it passes; otherwise nothing is added and the reason is returned.
   */
  accept(change: Change, baseClock: Clock): string | undefined {
    const actor = this.#actorOf(change.actor);
    // Automerge applies a change that skips its actor's previous one, then cannot load what it saves.
    const last = this.#lastOpOf(actor);
    if ((baseClock.get(change.actor) ?? 0) < last) {
      return `the change does not follow ${change.actor}'s previous change`;
    }
    const baseMax = Math.max(0, ...baseClock.values());
    if (change.startOp <= baseMax) {
      return `start op ${change.startOp} is not above ${baseMax}`;
    }
    // Every id of the change is above the actor's others, so its ops are the last rows and ids.
    const count = this.#count;
    const length = this.#ids.lengthOf(actor);
    const seen: Seen = { clock: baseClock, actor: change.actor, start: change.startOp, next: change.startOp };
    for (const op of change.ops) {
      const reason = this.#refusal(op, seen);
      if (reason !== undefined) {
        this.#count = count;
        this.#ids.truncate(actor, length);
        return reason;
      }
      this.#add(op, actor, seen.next, seen);
      seen.next++;
    }
    this.#register(change);
    return undefined;
  }

  /** Adds a peer's change, which Automerge accepted; its references are the peer's to get right. */
  applyChange(change: Change): void {
    const actor = this.#actorOf(change.actor);
    const seen: Seen = {
      clock: this.clockOf(change.deps),
      actor: change.actor,
      start: change.startOp,
      next: change.startOp,
    };
    for (const op of change.ops) {
      this.#add(op, actor, seen.next, seen);
      seen.next++;
    }
    this.#register(change);
  }

  #register(change: Change): void {
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
}
