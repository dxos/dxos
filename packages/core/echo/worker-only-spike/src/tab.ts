//
// Copyright 2026 DXOS.org
//

import { ImmutableString } from '@automerge/automerge/slim';

import * as Draft from '@dxos/automerge-proxy/Draft';
import type * as Op from '@dxos/automerge-proxy/Op';

import { encodeChange, sortedPreds } from './encode.ts';
import { type Change, type Clock, type DecodedOp, Model, type Patch, formatId, parseId } from './model.ts';

/** Marks every container a tab document hands out, so the spike namespace can answer for it. */
export const TAG = Symbol.for('dxos.worker-only-spike.tag');

export type Tag = { readonly tab: TabDoc; readonly heads: string[]; readonly path: readonly (string | number)[] };

export const tagOf = (value: unknown): Tag | undefined =>
  value !== null && typeof value === 'object' ? (value as { [TAG]?: Tag })[TAG] : undefined;

/** Messages the host sends a tab. A tab names its changes by their real hashes, so acks and refusals do too. */
export type HostMessage =
  | { type: 'change'; change: Change }
  | { type: 'ack'; hash: string }
  | { type: 'refuse'; hash: string; reason: string };

export type Snapshot = { bytes: Uint8Array; hashes: string[]; heads: string[] };

const randomActor = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');

type Options = {
  send: (change: Change, bytes: Uint8Array) => void;
  actor?: string;
  now?: () => number;
};

/**
 * A document in a tab with no Automerge: the model holds every op with its Automerge id, the tab
 * mints ids for its own ops, and the worker writes each change under exactly those ids.
 */
export class TabDoc {
  readonly #model: Model;
  readonly #send: (change: Change, bytes: Uint8Array) => void;
  readonly #bytes = new Map<string, Uint8Array>();
  readonly #now: () => number;
  readonly #listeners = new Set<() => void>();
  readonly #rejectedListeners = new Set<(changes: Change[], reason: string) => void>();
  readonly #pending: Change[] = [];
  #actor: string;
  /** This actor's changes by seq, confirmed or not: the next change's seq and base check come from it. */
  #own: string[] = [];
  #heads: string[];
  #cache?: { key: string; root: object; tag: Tag };

  constructor(model: Model, heads: string[], options: Options) {
    this.#model = model;
    this.#heads = heads;
    this.#send = options.send;
    this.#actor = options.actor ?? randomActor();
    this.#now = options.now ?? (() => Math.floor(Date.now() / 1000));
  }

  /** A document read from the host's snapshot: saved bytes, change hashes and heads. */
  static fromSnapshot(snapshot: Snapshot, options: Options): TabDoc {
    return new TabDoc(Model.fromSaved(snapshot.bytes, snapshot.hashes), [...snapshot.heads], options);
  }

  /** A document that exists only in this tab until a host takes its first change. */
  static create(initial: Record<string, unknown>, options: Options): TabDoc {
    const tab = new TabDoc(new Model(), [], options);
    tab.change((draft) => Object.assign(draft, initial));
    return tab;
  }

  get actor(): string {
    return this.#actor;
  }

  get model(): Model {
    return this.#model;
  }

  get pending(): readonly Change[] {
    return this.#pending;
  }

  heads(): string[] {
    return [...this.#heads];
  }

  //
  // Reads.
  //

  /** The document at the current version, as Automerge would materialize it. */
  doc(): any {
    const key = this.#heads.join(',');
    if (this.#cache?.key !== key) {
      const tag: Tag = { tab: this, heads: [...this.#heads], path: [] };
      this.#cache = { key, root: this.#materialize(tag), tag };
    }
    return this.#cache.root;
  }

  /** The document at `heads`, read-only, as `A.view` gives it. */
  view(heads: readonly string[]): any {
    return this.#materialize({ tab: this, heads: [...heads], path: [] });
  }

  #materialize(tag: Tag): object {
    const clock = this.clockOf(tag.heads);
    const value = this.#model.materialize('_root', clock);
    const mark = (node: unknown, path: (string | number)[]): void => {
      if (node === null || typeof node !== 'object' || node instanceof Date || node instanceof ImmutableString) {
        return;
      }
      Object.defineProperty(node, TAG, { value: { tab: this, heads: tag.heads, path } satisfies Tag });
      for (const [key, child] of Object.entries(node)) {
        mark(child, [...path, Array.isArray(node) ? Number(key) : key]);
      }
      Object.freeze(node);
    };
    mark(value, []);
    return value as object;
  }

  clockOf(heads: readonly string[]): Clock {
    return this.#model.clockOf(heads);
  }

  #textAt(path: readonly (string | number)[], clock: Clock): string {
    const objId = this.#model.objectAt(path, clock);
    if (!objId || this.#model.typeOf(objId) !== 'text') {
      throw new RangeError(`No text at ${JSON.stringify(path)}`);
    }
    return objId;
  }

  /** `A.getCursor` on a text of this document at `heads`. */
  cursor(
    heads: readonly string[],
    path: readonly (string | number)[],
    position: number,
    move?: 'before' | 'after',
  ): string {
    const clock = this.clockOf(heads);
    return this.#model.cursorAt(this.#textAt(path, clock), position, clock, move);
  }

  /** `A.getCursorPosition` on a text of this document at `heads`. */
  cursorPosition(heads: readonly string[], path: readonly (string | number)[], cursor: string): number {
    const clock = this.clockOf(heads);
    return this.#model.cursorPosition(this.#textAt(path, clock), cursor, clock);
  }

  diff(before: readonly string[], after: readonly string[]): Patch[] {
    return this.#model.diff(this.clockOf(before), this.clockOf(after));
  }

  conflicts(
    heads: readonly string[],
    path: readonly (string | number)[],
    prop: string | number,
  ): Record<string, unknown> | undefined {
    const clock = this.clockOf(heads);
    const objId = this.#model.objectAt(path, clock);
    return objId ? this.#model.conflicts(objId, prop, clock) : undefined;
  }

  /** Whether every head is in the current version's history. */
  hasHeads(heads: readonly string[]): boolean {
    return heads.every((head) => this.#model.hasChange(head) && this.#model.reaches(this.#heads, head));
  }

  //
  // Writes.
  //

  on(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  onRejected(listener: (changes: Change[], reason: string) => void): () => void {
    this.#rejectedListeners.add(listener);
    return () => this.#rejectedListeners.delete(listener);
  }

  #emit(): void {
    for (const listener of [...this.#listeners]) {
      listener();
    }
  }

  /** `handle.change`: records the callback's edits as one change on the current version. */
  change(fn: (draft: any) => void, options?: { time?: number; message?: string }): string[] | undefined {
    return this.#record(this.#heads, fn, options);
  }

  /** `handle.changeAt`: a change based on `heads`; returns the heads of that version plus the change. */
  changeAt(
    heads: readonly string[],
    fn: (draft: any) => void,
    options?: { time?: number; message?: string },
  ): string[] | undefined {
    return this.#record(heads, fn, options);
  }

  #record(
    baseHeads: readonly string[],
    fn: (draft: any) => void,
    options?: { time?: number; message?: string },
  ): string[] | undefined {
    const baseClock = this.clockOf(baseHeads);
    const base = this.#model.materialize('_root', baseClock);
    const recorder = new Draft.Recorder(freezeDeep(base));
    fn(recorder.draft());
    if (recorder.ops.length === 0) {
      return undefined;
    }
    // Automerge writes under a fresh actor when the base leaves out this actor's own last change.
    const ownLast = this.#own.length > 0 ? (this.#model.changeMeta(this.#own[this.#own.length - 1])?.maxOp ?? 0) : 0;
    if (ownLast > 0 && (baseClock.get(this.#actor) ?? 0) < ownLast) {
      this.#actor = randomActor();
      this.#own = [];
    }
    const actor = this.#actor;
    const seq = this.#own.length + 1;
    const startOp = this.#model.maxOp + 1;
    const ops = translate(this.#model, recorder.ops, baseClock, actor, startOp);
    const change: Change = {
      actor,
      seq,
      startOp,
      time: options?.time ?? this.#now(),
      message: options?.message ?? null,
      deps: [...baseHeads].sort(),
      hash: '',
      ops,
    };
    // The tab encodes the change as Automerge would, so its hash is known now and heads are real.
    const { bytes, hash } = encodeChange(change);
    change.hash = hash;
    this.#model.registerChange(change);
    this.#pending.push(change);
    this.#bytes.set(hash, bytes);
    this.#own.push(hash);
    this.#heads = reduceHeads(this.#model, [...this.#heads, hash]);
    this.#send(structuredClone(change), bytes);
    this.#emit();
    return [hash];
  }

  //
  // From the host.
  //

  receive(message: HostMessage): void {
    switch (message.type) {
      case 'change': {
        const { change } = message;
        if (this.#model.hasChange(change.hash)) {
          return;
        }
        this.#model.applyChange(change);
        this.#heads = reduceHeads(this.#model, [...this.#heads, change.hash]);
        this.#emit();
        return;
      }
      case 'ack': {
        const index = this.#pending.findIndex((change) => change.hash === message.hash);
        if (index >= 0) {
          this.#pending.splice(index, 1);
          this.#bytes.delete(message.hash);
        }
        return;
      }
      case 'refuse': {
        if (!this.#pending.some((change) => change.hash === message.hash)) {
          return;
        }
        // The refused change goes, with every pending change built on it; the worker refuses those too.
        const removed = new Set([message.hash]);
        for (const change of this.#pending) {
          if (change.deps.some((dep) => removed.has(dep))) {
            removed.add(change.hash);
          }
        }
        const dropped = this.#pending.filter((change) => removed.has(change.hash));
        this.#pending.splice(0, this.#pending.length, ...this.#pending.filter((change) => !removed.has(change.hash)));
        dropped.forEach((change) => this.#bytes.delete(change.hash));
        this.#model.remove(dropped);
        const restored = dropped.flatMap((change) => change.deps).filter((dep) => !removed.has(dep));
        this.#heads = reduceHeads(this.#model, [...this.#heads.filter((head) => !removed.has(head)), ...restored]);
        // This actor's dropped changes are a suffix of its chain, so their seqs are free again.
        const cut = this.#own.findIndex((hash) => removed.has(hash));
        if (cut >= 0) {
          this.#own.length = cut;
        }
        for (const listener of [...this.#rejectedListeners]) {
          listener(dropped, message.reason);
        }
        this.#emit();
      }
    }
  }

  /** Sends every unconfirmed change again. */
  resend(): void {
    for (const change of this.#pending) {
      const bytes = this.#bytes.get(change.hash);
      if (bytes) {
        this.#send(structuredClone(change), bytes);
      }
    }
  }

  /**
   * Catches up with a worker that restarted and lost what it had not saved: takes the changes the
   * worker has and this tab lacks, and sends back every change this tab holds that the worker lacks,
   * its own or not, since any change rebuilt from the model encodes to the bytes of its hash.
   */
  reconnect(snapshot: Snapshot): void {
    const theirs = new Set(snapshot.hashes);
    const missing = snapshot.hashes.filter((hash) => !this.#model.hasChange(hash));
    if (missing.length > 0) {
      const fresh = Model.fromSaved(snapshot.bytes, snapshot.hashes);
      missing.forEach((hash) => this.#model.applyChange(fresh.changeOf(hash)));
    }
    // A pending change the worker saved before its ack was lost is confirmed.
    for (const change of [...this.#pending]) {
      if (theirs.has(change.hash)) {
        this.#pending.splice(this.#pending.indexOf(change), 1);
        this.#bytes.delete(change.hash);
      }
    }
    // The model registers changes in causal order, so this resends dependencies first.
    for (const hash of this.#model.changeHashes()) {
      if (!theirs.has(hash)) {
        const change = this.#model.changeOf(hash);
        this.#send(change, this.#bytes.get(hash) ?? encodeChange(change).bytes);
      }
    }
    this.#heads = reduceHeads(this.#model, [...this.#heads, ...snapshot.heads]);
    if (missing.length > 0) {
      this.#emit();
    }
  }
}

/** Keeps the heads no other head reaches. */
export const reduceHeads = (model: Model, heads: readonly string[]): string[] => {
  const unique = [...new Set(heads)];
  return unique.filter((head) => !unique.some((other) => other !== head && model.reaches([other], head)));
};

const freezeDeep = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !(value instanceof Date) && !(value instanceof ImmutableString)) {
    for (const child of Object.values(value)) {
      freezeDeep(child);
    }
    Object.freeze(value);
  }
  return value;
};

/**
 * Turns the draft's positional ops into Automerge ops with ids from `startOp` under `actor`, reading
 * positions against `baseClock` plus the ops already emitted, and applies each op to the model.
 */
export const translate = (
  model: Model,
  ops: readonly Op.Any[],
  baseClock: Clock,
  actor: string,
  startOp: number,
): DecodedOp[] => {
  const out: DecodedOp[] = [];
  let counter = startOp;
  const clock = new Map(baseClock);
  const emit = (draft: DecodedOp): string => {
    const op = { ...draft, pred: sortedPreds(draft.pred).map(formatId) };
    const key = formatId([counter, actor]);
    clock.set(actor, counter);
    counter++;
    model.applyOp(key, op);
    out.push(op);
    return key;
  };
  const containerOf = (path: Op.Path): string => {
    const objId = model.objectAt(path, clock);
    if (!objId) {
      throw new Error(`No container at ${JSON.stringify(path)}`);
    }
    return objId;
  };

  /** Emits the ops that write `value` at `where` in `objId`; returns the id of the op holding it. */
  const emitValue = (
    objId: string,
    where: { key?: string; elemId?: string },
    value: unknown,
    pred: string[],
    insert: boolean,
  ): string => {
    const at = { obj: objId, ...where, ...(insert ? { insert: true } : {}), pred };
    if (typeof value === 'string') {
      const textId = emit({ action: 'makeText', ...at });
      let ref = '_head';
      for (const char of value) {
        ref = emit({ action: 'set', obj: textId, elemId: ref, insert: true, value: char, pred: [] });
      }
      return textId;
    }
    if (Array.isArray(value)) {
      const listId = emit({ action: 'makeList', ...at });
      let ref = '_head';
      for (const item of value) {
        ref = emitValue(listId, { elemId: ref }, item, [], true);
      }
      return listId;
    }
    if (value instanceof ImmutableString) {
      return emit({ action: 'set', ...at, value: value.toString() });
    }
    if (value instanceof Date) {
      return emit({ action: 'set', ...at, value: value.getTime(), datatype: 'timestamp' });
    }
    if (typeof value === 'number') {
      return emit({ action: 'set', ...at, value, datatype: Number.isInteger(value) ? 'int' : 'float64' });
    }
    if (value === null || typeof value === 'boolean') {
      return emit({ action: 'set', ...at, value });
    }
    if (typeof value === 'object') {
      const mapId = emit({ action: 'makeMap', ...at });
      for (const [key, child] of Object.entries(value)) {
        if (child !== undefined) {
          emitValue(mapId, { key }, child, [], false);
        }
      }
      return mapId;
    }
    throw new TypeError(`Unsupported value ${String(value)}`);
  };

  for (const op of ops) {
    const parentPath = op.path.slice(0, -1);
    const last = op.path[op.path.length - 1];
    switch (op.type) {
      case 'put': {
        const parentId = containerOf(parentPath);
        if (model.typeOf(parentId) === 'map') {
          emitValue(
            parentId,
            { key: String(last) },
            op.value,
            model.currentValueIds(parentId, String(last), clock),
            false,
          );
        } else {
          const elem = model.visibleElements(parentId, clock)[Number(last)];
          emitValue(parentId, { elemId: elem.key }, op.value, model.elementValueIds(elem, clock), false);
        }
        break;
      }
      case 'del': {
        const parentId = containerOf(parentPath);
        emit({
          action: 'del',
          obj: parentId,
          key: String(last),
          pred: model.currentValueIds(parentId, String(last), clock),
        });
        break;
      }
      case 'insert': {
        const parentId = containerOf(parentPath);
        const index = Number(last);
        let ref = index === 0 ? '_head' : model.visibleElements(parentId, clock)[index - 1].key;
        for (const value of op.values) {
          ref = emitValue(parentId, { elemId: ref }, value, [], true);
        }
        break;
      }
      case 'remove': {
        const parentId = containerOf(parentPath);
        const index = Number(last);
        const targets = model.visibleElements(parentId, clock).slice(index, index + op.count);
        const preds = targets.map((elem) => model.elementValueIds(elem, clock));
        targets.forEach((elem, position) =>
          emit({ action: 'del', obj: parentId, elemId: elem.key, pred: preds[position] }),
        );
        break;
      }
      case 'splice': {
        const textId = containerOf(op.path);
        // Collect the characters to delete before inserting, as Automerge numbers inserts first.
        const targets: { key: string; pred: string[] }[] = [];
        let position = op.index;
        while (position < op.index + op.remove) {
          const found = model.textElementAt(textId, position, clock);
          if (!found) {
            break;
          }
          targets.push({ key: found.elem.key, pred: model.elementValueIds(found.elem, clock) });
          position = found.start + found.width;
        }
        let ref = op.index === 0 ? '_head' : model.textElementAt(textId, op.index - 1, clock)!.elem.key;
        for (const char of op.insert) {
          ref = emit({ action: 'set', obj: textId, elemId: ref, insert: true, value: char, pred: [] });
        }
        for (const target of targets) {
          emit({ action: 'del', obj: textId, elemId: target.key, pred: target.pred });
        }
        break;
      }
    }
  }
  return out;
};

export { parseId };
