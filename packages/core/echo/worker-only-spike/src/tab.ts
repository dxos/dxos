//
// Copyright 2026 DXOS.org
//

import * as Draft from '@dxos/automerge-proxy/Draft';
import * as Op from '@dxos/automerge-proxy/Op';

import { encodeChange, sortedPreds } from './encode.ts';
import { type Change, type Clock, type DecodedOp, formatId } from './ids.ts';
import { isImmutableString } from './immutable-string.ts';
import { Model, type Patch } from './model.ts';
import { readChange } from './reader.ts';

/** The tag of every container a tab document hands out, so the spike namespace can answer for it. */
const TAGS = new WeakMap<object, Tag>();

/**
 * Where a container sits: the document, the version it belongs to, and its path there. A container a
 * later version shares keeps its tag, which still names it at its own version.
 */
export type Tag = { readonly tab: TabDocument; readonly heads: string[]; readonly path: readonly (string | number)[] };

export const tagOf = (value: unknown): Tag | undefined =>
  typeof value === 'object' && value !== null ? TAGS.get(value) : undefined;

/** Messages the host sends a tab. A tab names its changes by their real hashes, so acks and refusals do too. */
export type HostMessage =
  | { type: 'change'; change: Change }
  | { type: 'ack'; hash: string }
  | { type: 'refuse'; hash: string; reason: string };

/**
 * What a tab opens a document from. `hashes` holds each change's hash in the snapshot layout (see
 * `hashesByActor`); without it, the tab computes them from the bytes.
 */
export type Snapshot = { bytes: Uint8Array; hashes?: Uint8Array; heads: string[] };

/** A new version of a tab document, with Automerge-shaped patches from the one before. */
export type TabChange<T> = { before: T; after: T; patches: Patch[]; source: 'change' | 'host' };

const randomActor = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');

type ChangeOptions = { time?: number; message?: string };

/** A tab document of any shape, as Automerge's namespace sees one: its drafts and values are unknown. */
export interface TabDocument {
  readonly actor: string;
  readonly model: Model;
  heads(): string[];
  doc(): unknown;
  view(heads: readonly string[]): unknown;
  cursor(
    heads: readonly string[],
    path: readonly (string | number)[],
    position: number,
    move?: 'before' | 'after',
  ): string;
  cursorPosition(heads: readonly string[], path: readonly (string | number)[], cursor: string): number;
  diff(before: readonly string[], after: readonly string[]): Patch[];
  conflicts(
    heads: readonly string[],
    path: readonly (string | number)[],
    prop: string | number,
  ): Record<string, unknown> | undefined;
  change(fn: (draft: unknown) => void, options?: ChangeOptions): string[] | undefined;
  changeAt(heads: readonly string[], fn: (draft: unknown) => void, options?: ChangeOptions): string[] | undefined;
  applyChanges(changes: readonly Change[]): void;
  lastLocalChange(): Change | undefined;
  changesIn(heads: readonly string[]): Change[];
  receive(message: HostMessage): void;
}

type Options = {
  /** Where changes go; a document with none exists only in this tab, as `A.from` makes one. */
  send?: (change: Change, bytes: Uint8Array) => void;
  actor?: string;
  now?: () => number;
};

/**
 * A document in a tab with no Automerge: the model holds every op with its Automerge id, the tab
 * mints ids for its own ops, and the worker writes each change under exactly those ids. `T` is the
 * document's shape as its callers name it, as with `A.Doc<T>`.
 */
export class TabDoc<T = unknown> implements TabDocument {
  readonly #model: Model;
  readonly #send?: (change: Change, bytes: Uint8Array) => void;
  readonly #bytes = new Map<string, Uint8Array>();
  readonly #now: () => number;
  readonly #listeners = new Set<(change: TabChange<T>) => void>();
  readonly #rejectedListeners = new Set<(changes: Change[], reason: string) => void>();
  readonly #pending: Change[] = [];
  #actor: string;
  /** This actor's changes by seq, confirmed or not: the next change's seq and base check come from it. */
  #own: string[] = [];
  #heads: string[];
  /** The document at `#heads`, kept current by each change instead of read again from the model. */
  #root: T;

  constructor(model: Model, heads: string[], options: Options) {
    this.#model = model;
    this.#heads = heads;
    this.#send = options.send;
    this.#actor = options.actor ?? randomActor();
    this.#now = options.now ?? (() => Math.floor(Date.now() / 1000));
    this.#root = this.view(heads);
  }

  /** A document read from the host's snapshot: saved bytes, change hashes and heads. */
  static fromSnapshot<T>(snapshot: Snapshot, options: Options): TabDoc<T> {
    return new TabDoc<T>(Model.fromSaved(snapshot.bytes, snapshot.hashes), [...snapshot.heads], options);
  }

  /** A document built from changes, as `A.load` of change chunks or `A.clone` builds one. */
  static fromChanges<T>(changes: readonly Change[], options: Options): TabDoc<T> {
    const model = new Model();
    const ordered = causalOrder(changes);
    ordered.forEach((change) => model.applyChange(change));
    return new TabDoc<T>(model, headsOf(ordered), options);
  }

  /** `A.load`: a saved document (uncompressed) or change chunks back to back, in any order. */
  static load<T>(bytes: Uint8Array, options: Options): TabDoc<T> {
    // The chunk type follows the magic bytes and the checksum.
    if (bytes[8] === 0) {
      const model = Model.fromSaved(bytes);
      return new TabDoc<T>(model, headsOf(model.changeHashes().map((hash) => model.changeOf(hash))), options);
    }
    const changes: Change[] = [];
    for (let offset = 0; offset < bytes.length;) {
      const { end, ...change } = readChange(bytes, offset);
      changes.push(change);
      offset = end;
    }
    return TabDoc.fromChanges<T>(changes, options);
  }

  /** A document that exists only in this tab until a host takes its first change. */
  static create<T extends object>(initial: T, options: Options): TabDoc<T> {
    const tab = new TabDoc<T>(new Model(), [], options);
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
  doc(): T {
    return this.#root;
  }

  /** The document at `heads`, read-only, as `A.view` gives it. */
  view(heads: readonly string[]): T {
    const at = [...heads];
    const value = this.#model.materialize('_root', this.clockOf(at));
    this.#tagNew(value, at, []);
    // The model holds whatever its writers wrote; `T` is the caller's claim about it, as in `A.load<T>`.
    return value as T;
  }

  /** Tags and freezes the containers of `node` that no earlier version of this document shares. */
  #tagNew(node: unknown, heads: string[], path: readonly (string | number)[]): void {
    if (!Op.isContainer(node) || TAGS.get(node)?.tab === this) {
      return;
    }
    TAGS.set(node, { tab: this, heads, path });
    const list = Array.isArray(node);
    for (const [key, child] of Object.entries(node)) {
      this.#tagNew(child, heads, [...path, list ? Number(key) : key]);
    }
    Object.freeze(node);
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

  /** Called with each new version, whether this tab or the host made it. */
  on(listener: (change: TabChange<T>) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  onRejected(listener: (changes: Change[], reason: string) => void): () => void {
    this.#rejectedListeners.add(listener);
    return () => this.#rejectedListeners.delete(listener);
  }

  /** Moves to the model's heads with `root` as the document there, and tells the listeners. */
  #advance(root: T, patches: Patch[], source: TabChange<T>['source']): void {
    const before = this.#root;
    this.#heads = this.#model.heads();
    // The root carries the version in its tag, so every version gets its own root object.
    const after = root === before ? copyRoot(root) : root;
    this.#tagNew(after, [...this.#heads], []);
    this.#root = after;
    for (const listener of [...this.#listeners]) {
      listener({ before, after, patches, source });
    }
  }

  /** Runs `apply` on the model, then patches the document with what changed; costs what the change touched. */
  #advanceBy(apply: () => void): void {
    const before = this.#model.clockOf(this.#heads);
    apply();
    const heads = this.#model.heads();
    if (heads.join(',') === this.#heads.join(',')) {
      return;
    }
    const patches = this.#model.diff(before, this.#model.clockOf(heads));
    this.#advance(applyPatches(this.#root, patches), patches, 'host');
  }

  /** `handle.change`: records the callback's edits as one change on the current version. */
  change(fn: (draft: T) => void, options?: ChangeOptions): string[] | undefined {
    return this.#record(this.#heads, fn, options);
  }

  /** `handle.changeAt`: a change based on `heads`; returns the heads of that version plus the change. */
  changeAt(heads: readonly string[], fn: (draft: T) => void, options?: ChangeOptions): string[] | undefined {
    return this.#record(heads, fn, options);
  }

  #record(baseHeads: readonly string[], fn: (draft: T) => void, options?: ChangeOptions): string[] | undefined {
    const baseClock = this.clockOf(baseHeads);
    const current = baseHeads.join(',') === this.#heads.join(',');
    const before = current ? this.#root : undefined;
    const clockBefore = current ? baseClock : this.#model.clockOf(this.#heads);
    const recorder = new Draft.Recorder(before ?? freezeDeep(this.#model.materialize('_root', baseClock)));
    // A draft stands in for the document, so it has the document's claimed shape.
    fn(recorder.draft() as T);
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
    this.#own.push(hash);
    if (this.#send) {
      this.#pending.push(change);
      this.#bytes.set(hash, bytes);
      this.#send(structuredClone(change), bytes);
    }
    if (before !== undefined) {
      // On the current version the draft's ops are the patch: the document moves without a diff.
      const { root, patches } = Op.apply(before, recorder.ops);
      this.#advance(root, patches, 'change');
    } else {
      const patches = this.#model.diff(clockBefore, this.#model.clockOf(this.#model.heads()));
      this.#advance(applyPatches(this.#root, patches), patches, 'change');
    }
    return [hash];
  }

  //
  // From the host.
  //

  receive(message: HostMessage): void {
    switch (message.type) {
      case 'change': {
        const { change } = message;
        if (!this.#model.hasChange(change.hash)) {
          this.#advanceBy(() => this.#model.applyChange(change));
        }
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
        // The dropped changes end their actors' chains, so the version without them caps those actors below them.
        const clock = this.#model.clockOf(this.#heads);
        const without = new Map(clock);
        for (const change of dropped) {
          without.set(change.actor, Math.min(without.get(change.actor) ?? Infinity, change.startOp - 1));
        }
        const patches = this.#model.diff(clock, without);
        this.#model.remove(dropped);
        // This actor's dropped changes are a suffix of its chain, so their seqs are free again.
        const cut = this.#own.findIndex((hash) => removed.has(hash));
        if (cut >= 0) {
          this.#own.length = cut;
        }
        // Containers other changes made carry heads that name the dropped changes, so the document is read
        // again in full; only a bug in the tab produces a refusal.
        this.#advance(this.view(this.#model.heads()), patches, 'host');
        for (const listener of [...this.#rejectedListeners]) {
          listener(dropped, message.reason);
        }
      }
    }
  }

  /** Sends every unconfirmed change again. */
  resend(): void {
    for (const change of this.#pending) {
      const bytes = this.#bytes.get(change.hash);
      if (bytes) {
        this.#send?.(structuredClone(change), bytes);
      }
    }
  }

  /**
   * Changes from elsewhere, as `A.applyChanges` or `A.merge` bring them: applied here, and relayed to
   * the worker when there is one, which checks them like any change a tab sends.
   */
  applyChanges(changes: readonly Change[]): void {
    const fresh = changes.filter((change) => !this.#model.hasChange(change.hash));
    this.#advanceBy(() => {
      for (const change of fresh) {
        this.#model.applyChange(change);
        this.#send?.(structuredClone(change), encodeChange(change).bytes);
      }
    });
  }

  /** The last change this tab wrote under its current actor, as `A.getLastLocalChange` gives it. */
  lastLocalChange(): Change | undefined {
    const hash = this.#own[this.#own.length - 1];
    return hash === undefined ? undefined : this.#model.changeOf(hash);
  }

  /** Every change `heads` reach, in causal order. */
  changesIn(heads: readonly string[]): Change[] {
    return this.#model.changesIn(heads).map((hash) => this.#model.changeOf(hash));
  }

  /**
   * Catches up with a worker that restarted and lost what it had not saved: takes the changes the
   * worker has and this tab lacks, and sends back every change this tab holds that the worker lacks,
   * its own or not, since any change rebuilt from the model encodes to the bytes of its hash.
   */
  reconnect(snapshot: Snapshot): void {
    const fresh = Model.fromSaved(snapshot.bytes, snapshot.hashes);
    const theirs = new Set(fresh.changeHashes());
    const missing = fresh.changeHashes().filter((hash) => !this.#model.hasChange(hash));
    this.#advanceBy(() => missing.forEach((hash) => this.#model.applyChange(fresh.changeOf(hash))));
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
        this.#send?.(change, this.#bytes.get(hash) ?? encodeChange(change).bytes);
      }
    }
  }
}

/** A new root object with the same entries, frozen. */
const copyRoot = <T>(root: T): T => {
  if (!Op.isContainer(root)) {
    return root;
  }
  const copy = Array.isArray(root) ? [...root] : { ...root };
  // The copy has the root's own shape.
  return Object.freeze(copy) as T;
};

/**
 * Applies model patches to a frozen document, copying only the containers on their paths. A patch on
 * a numeric index edits the text or list there, so the container's kind decides the op.
 */
const applyPatches = <T>(root: T, patches: readonly Patch[]): T => {
  let current: unknown = root;
  for (const patch of patches) {
    const op = toOp(current, patch);
    if (op) {
      current = Op.apply(current, [op], { strict: true }).root;
    }
  }
  // Patches keep the document's shape.
  return current as T;
};

const toOp = (root: unknown, patch: Patch): Op.Any | undefined => {
  const parentPath = patch.path.slice(0, -1);
  const last = patch.path[patch.path.length - 1];
  const inText = typeof Op.getAt(root, parentPath) === 'string';
  switch (patch.action) {
    case 'conflict':
      return undefined;
    case 'put':
      return inText
        ? { type: 'splice', path: parentPath, index: Number(last), remove: 1, insert: String(patch.value) }
        : { type: 'put', path: patch.path, value: patch.value };
    case 'insert':
      return { type: 'insert', path: patch.path, values: patch.values };
    case 'splice':
      return { type: 'splice', path: parentPath, index: Number(last), remove: 0, insert: patch.value };
    case 'del':
      if (typeof last === 'string') {
        return { type: 'del', path: patch.path };
      }
      return inText
        ? { type: 'splice', path: parentPath, index: last, remove: patch.length ?? 1, insert: '' }
        : { type: 'remove', path: patch.path, count: patch.length ?? 1 };
  }
};

/** The changes no other change names as a dependency, sorted as Automerge sorts heads. */
const headsOf = (changes: readonly Change[]): string[] => {
  const depended = new Set(changes.flatMap((change) => change.deps));
  return changes
    .map((change) => change.hash)
    .filter((hash) => !depended.has(hash))
    .sort();
};

/** Changes with every dependency before its dependents; one missing from the set is an error. */
const causalOrder = (changes: readonly Change[]): Change[] => {
  const byHash = new Map(changes.map((change) => [change.hash, change]));
  const waiting = new Map<string, number>();
  const dependents = new Map<string, Change[]>();
  const ready: Change[] = [];
  for (const change of byHash.values()) {
    for (const dep of change.deps) {
      if (!byHash.has(dep)) {
        throw new Error(`Missing dependency ${dep}`);
      }
      dependents.set(dep, [...(dependents.get(dep) ?? []), change]);
    }
    waiting.set(change.hash, change.deps.length);
    if (change.deps.length === 0) {
      ready.push(change);
    }
  }
  const out: Change[] = [];
  for (let next = ready.shift(); next; next = ready.shift()) {
    out.push(next);
    for (const dependent of dependents.get(next.hash) ?? []) {
      const left = (waiting.get(dependent.hash) ?? 0) - 1;
      waiting.set(dependent.hash, left);
      if (left === 0) {
        ready.push(dependent);
      }
    }
  }
  if (out.length !== byHash.size) {
    throw new Error('Changes form a cycle');
  }
  return out;
};

const freezeDeep = <T>(value: T): T => {
  if (
    value !== null &&
    typeof value === 'object' &&
    !(value instanceof Date) &&
    !isImmutableString(value) &&
    !(value instanceof Uint8Array)
  ) {
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
    if (isImmutableString(value)) {
      return emit({ action: 'set', ...at, value: value.toString() });
    }
    if (value instanceof Date) {
      return emit({ action: 'set', ...at, value: value.getTime(), datatype: 'timestamp' });
    }
    if (value instanceof Uint8Array) {
      return emit({ action: 'set', ...at, value: new Uint8Array(value) });
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
        let ref = '_head';
        if (op.index > 0) {
          const previous = model.textElementAt(textId, op.index - 1, clock);
          if (!previous) {
            throw new RangeError(`No character at ${op.index - 1}`);
          }
          ref = previous.elem.key;
        }
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
