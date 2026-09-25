//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { ChangeFn, ChangeOptions, Doc, Heads, Patch } from '@automerge/automerge';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { EventEmitter } from 'eventemitter3';

import { Event, Trigger, TriggerState } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type * as Contract from './Contract.ts';
import * as Draft from './Draft.ts';
import { DocumentUnavailableError } from './errors.ts';
import { randomId } from './internal/index.ts';
import * as Op from './Op.ts';
import * as Sync from './Sync.ts';

/** Names the state of a document shown from the host's copy, which no host numbering ever uses. */
const COPY_EPOCH = 'copy';

/**
 * `pending` until the host answers, `requesting` while it fetches a document its storage lacks,
 * `ready` once the document is usable, and `unavailable` when the host cannot produce it.
 */
export type State = 'pending' | 'requesting' | 'ready' | 'unavailable';

export type ChangeEvent<T> = {
  handle: DocHandle<T>;
  doc: Doc<T>;
  patches: Patch[];
  /** `change` is a write through this handle; `host` is anything the host delivered. */
  patchInfo: { before: Doc<T>; after: Doc<T>; source: 'change' | 'host' };
};

export type Events<T> = {
  change: ChangeEvent<T>;
  delete: { handle: DocHandle<T> };
  /** The handle left `unavailable` because the document arrived after all. */
  available: { handle: DocHandle<T> };
};

export type Options<T, Id extends string> = {
  /** Tags this client's batches, so the host's entries acknowledge them. */
  clientId: string;
  documentId?: Id;
  /** Content of a document this client is creating; edits made before the host answers are kept. */
  initialValue?: T;
  /** Show the host's copy of the document (see {@link Contract.CopyEvent}) until the first write. */
  followCopy?: boolean;
  onDelete?: () => void;
  /** The error {@link DocHandle.whenReady} rejects with when the host cannot produce the document. */
  unavailableError?: (documentId: string) => Error;
};

/** Confirmed heads of each document value a handle hands out, and of values given to {@link register}. */
const views = new WeakMap<object, readonly string[]>();

/** Marks a value as a proxy document whose confirmed heads are `heads`; returns the value. */
export const register = <T>(doc: T, heads: readonly string[]): T => {
  if (typeof doc === 'object' && doc !== null) {
    views.set(doc, heads);
  }
  return doc;
};

/** Whether a value is a document a handle handed out or one given to {@link register}. */
export const isProxyDoc = (doc: object): boolean => views.has(doc);

/** Confirmed heads of a proxy document, which lag its unconfirmed edits; undefined for any other value. */
export const getHeads = (doc: object): Heads | undefined => {
  const heads = views.get(doc);
  return heads ? [...heads] : undefined;
};

/**
 * A document handle with Automerge's shape over a proxy: the client holds the state the host
 * confirmed plus its own unconfirmed edits, and no Automerge document.
 *
 * Reads and writes stay synchronous. What changes is heads: they are the last confirmed ones, so a
 * write moves them only once the host has applied and saved it. A repo feeds the handle the host's
 * events through {@link _receive} and sends what {@link _takeBatch} returns.
 */
export class DocHandle<T, Id extends string = string> extends EventEmitter<Events<T>> {
  readonly _internalId = randomId();

  /** Fires when the host confirms a batch or the handle catches up; a flush waits on it. */
  readonly confirmed = new Event<void>();

  /** Fires when an entry skips versions; resubscribing from this client's version fills the gap. */
  readonly gap = new Event<void>();

  /** Fires with this client's changes the host refused, before the {@link confirmed} that settles them. */
  readonly refused = new Event<Op.Change[]>();

  /** Fires on the first write to a document shown from the host's copy, which needs the live document. */
  readonly upgrade = new Event<void>();

  /**
   * The document as an atom whose value is the frozen tree {@link doc} returns, not a copy of it, so an
   * atom derived from a subtree sees an unchanged subtree as the same value and does not notify.
   */
  readonly atom: Atom.Atom<Doc<T>> = Atom.make((get) => {
    const update = () => get.setSelf(this.#view());
    this.on('change', update);
    get.addFinalizer(() => this.off('change', update));
    return this.#view();
  });

  readonly #clientId: string;
  readonly #onDelete?: () => void;
  readonly #unavailableError: (documentId: string) => Error;
  readonly #ready = new Trigger();
  readonly #stored = new Trigger<boolean>();
  #state: State = 'pending';
  #documentId?: Id;
  #epoch?: string;
  #client?: Sync.ClientState<T>;
  /** State before the host's first snapshot: the initial value of a document being created. */
  #local: T;
  /** Changes made before the host's first snapshot. */
  #early: Op.Any[][] = [];
  #deleted = false;
  /** Shown from the host's copy: readable, but not written until the live document answers. */
  #copy = false;
  /** Until the first write or a live answer, since a live handle ignores copies and must not ask for them. */
  #followsCopy: boolean;
  /** Created by this client, so a flush waits for the host's first snapshot of it. */
  readonly #created: boolean;

  constructor({ clientId, documentId, initialValue, followCopy = false, onDelete, unavailableError }: Options<T, Id>) {
    super();
    this.#clientId = clientId;
    this.#documentId = documentId;
    this.#onDelete = onDelete;
    this.#unavailableError = unavailableError ?? ((documentId) => new DocumentUnavailableError(documentId));
    this.#created = initialValue !== undefined;
    this.#followsCopy = followCopy;
    // Caller data becomes the frozen state; T is the caller's promise about its shape.
    this.#local = Op.freeze((initialValue ?? {}) as T);
  }

  get documentId(): Id | undefined {
    return this.#documentId;
  }

  get state(): State {
    return this.#state;
  }

  /** Last confirmed heads; unconfirmed edits do not move them. */
  get heads(): Heads {
    return [...(this.#client?.heads ?? [])];
  }

  /** Edits not yet confirmed, relative to the confirmed state, in order. */
  get pendingOps(): Op.Any[] {
    return [...this.#early.flat(), ...(this.#client?.pendingOps ?? [])];
  }

  get hasPending(): boolean {
    return this.#early.length > 0 || (this.#client?.hasPending ?? false);
  }

  /** Whether an unconfirmed op writes at `path`, inside it, or replaces a container above it. */
  hasPendingAt(path: readonly (string | number)[]): boolean {
    return this.pendingOps.some((op) => {
      const shared = Math.min(op.path.length, path.length);
      return op.path.slice(0, shared).every((key, index) => String(key) === String(path[index]));
    });
  }

  /** A document this client created that the host has not sent back yet. */
  get awaitingCreation(): boolean {
    return this.#created && !this.isReady();
  }

  get isDeleted(): boolean {
    return this.#deleted;
  }

  /** Whether the document is still shown from the host's copy, with no live subscription to it. */
  get isCopy(): boolean {
    return this.#copy;
  }

  /** Whether (re)subscriptions should ask for the host's copy rather than its live document. */
  get followsCopy(): boolean {
    return this.#followsCopy;
  }

  doc(): Doc<T> {
    invariant(!this.#deleted, 'DocHandle.doc called on deleted doc');
    return this.#view();
  }

  async whenReady(): Promise<void> {
    await this.#ready.wait();
  }

  isReady(): boolean {
    return this.#ready.state === TriggerState.RESOLVED;
  }

  /** True once the document is ready from the host's storage; false when the host is fetching it or cannot produce it. */
  async whenStored(): Promise<boolean> {
    return this.#stored.wait();
  }

  change(callback: ChangeFn<T>, _options?: ChangeOptions<T>): void {
    invariant(!this.#deleted, 'DocHandle.change called on deleted doc');
    const before = this.doc();
    const recorder = new Draft.Recorder<Doc<T>>(before);
    // The draft emulates the document the callback expects; its type cannot be derived from a Proxy.
    callback(recorder.draft() as T);
    if (recorder.ops.length === 0) {
      return;
    }
    let patches: Op.Patch[];
    if (this.#client) {
      patches = this.#client.applyLocal(recorder.ops);
    } else {
      ({ root: this.#local, patches } = Op.apply(this.#local, recorder.ops));
      this.#early.push([...recorder.ops]);
    }
    const after = this.doc();
    this.emit('change', {
      handle: this,
      doc: after,
      patches: toPatches(patches),
      patchInfo: { before, after, source: 'change' },
    });
    if (this.#followsCopy) {
      this.#followsCopy = false;
      this.upgrade.emit();
    }
  }

  /**
   * Writes against the current state when `heads` are current. A proxy cannot write against older
   * heads, since that needs the Automerge history the host holds.
   */
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): Heads | undefined {
    const current = this.heads;
    if (this.hasPending || heads.length !== current.length || heads.some((head) => !current.includes(head))) {
      throw new Error('changeAt against older heads is not supported by a proxy handle');
    }
    this.change(callback, options);
    return undefined;
  }

  delete(): void {
    this.#onDelete?.();
    this.emit('delete', { handle: this });
    this.#deleted = true;
  }

  /** What the client holds, sent when resubscribing so the host can send only what it missed. */
  _known(): Contract.Known | undefined {
    if (!this.#client || !this.#epoch) {
      return undefined;
    }
    const inflight = this.#client.inflight?.batchId;
    return {
      epoch: this.#epoch,
      version: this.#client.version,
      heads: [...this.#client.heads],
      ...(inflight ? { inflight } : {}),
    };
  }

  /** The next batch to submit, if there is no batch in flight and there are buffered edits. */
  _takeBatch(): { epoch: string; batch: Sync.Batch } | undefined {
    if (!this.#client || !this.#epoch || this.#copy) {
      return undefined;
    }
    const batch = this.#client.takeBatch(`${this.#clientId}:${randomId().slice(0, 16)}`);
    return batch ? { epoch: this.#epoch, batch } : undefined;
  }

  /** Names a document this client created, once the host has minted its id. */
  _setDocumentId(documentId: Id): void {
    this.#documentId = documentId;
  }

  /** Rejects {@link whenReady}, for a creation the host never took. */
  _failReady(error: Error): void {
    this.#ready.throw(error);
  }

  /** Not in the host's storage: storage-only callers settle now; the document may still arrive. */
  _markRequesting(): void {
    if (this.#state !== 'pending') {
      return;
    }
    this.#state = 'requesting';
    if (this.#stored.state !== TriggerState.RESOLVED) {
      this.#stored.wake(false);
    }
  }

  /** The host cannot produce the document; a later snapshot still makes it available. */
  _markUnavailable(documentId: string): void {
    if (this.#state === 'ready') {
      return;
    }
    this.#state = 'unavailable';
    this.#ready.throw(this.#unavailableError(documentId));
    if (this.#stored.state !== TriggerState.RESOLVED) {
      this.#stored.wake(false);
    }
  }

  /** Integrates an event from the host. */
  _receive(event: Contract.DocumentEvent): void {
    switch (event.type) {
      case 'snapshot':
        return this.#applySnapshot(event);
      case 'entry':
        return this.#applyEntry(event);
      case 'recovered':
        return this.#applyRecovered(event);
      case 'caughtUp':
        return this.#applyCaughtUp(event);
      case 'copy':
        return this.#applyCopy(event);
      case 'requesting':
        return this._markRequesting();
      case 'unavailable':
        return this._markUnavailable(event.documentId);
    }
  }

  #applySnapshot(event: Extract<Contract.DocumentEvent, { type: 'snapshot' }>): void {
    const before = this.doc();
    // Structured-clone data from the host; T is the caller's promise about its shape.
    const value = Op.freeze(event.value as T);
    this.#epoch = event.epoch;
    this.#copy = false;
    this.#followsCopy = false;
    let patches: Op.Patch[];
    let refused: Op.Change[] = [];
    if (this.#client) {
      ({ patches, refused } = this.#client.reset(
        value,
        event.version,
        event.heads,
        event.applied ?? false,
        event.refusedAt,
      ));
    } else {
      this.#client = new Sync.ClientState<T>(this.#clientId, value, event.version, event.heads);
      for (const change of this.#early) {
        this.#client.applyLocal(change);
      }
      this.#early = [];
      patches = topLevelPuts(this.#client.current);
    }
    this.#wakeReady();
    this.#emitHostChange(before, patches);
    this.#emitRefused(refused);
    this.confirmed.emit();
  }

  #applyEntry(event: Extract<Contract.DocumentEvent, { type: 'entry' }>): void {
    if (!this.#client || event.epoch !== this.#epoch || event.entry.version <= this.#client.version) {
      // Another numbering, which a resubscription replaces, or an entry already integrated.
      return;
    }
    if (event.entry.version > this.#client.version + 1) {
      this.gap.emit();
      return;
    }
    const before = this.doc();
    const { patches, acknowledged, refused } = this.#client.receive({
      version: event.entry.version,
      ops: event.entry.ops.filter(Op.is),
      heads: event.entry.heads,
      ...(event.entry.origin ? { origin: event.entry.origin } : {}),
    });
    if (patches.length > 0) {
      this.#emitHostChange(before, patches);
    }
    this.#emitRefused(refused);
    if (acknowledged || !this.#client.hasPending) {
      this.confirmed.emit();
    }
  }

  #applyRecovered(event: Extract<Contract.DocumentEvent, { type: 'recovered' }>): void {
    if (!this.#client || event.epoch === this.#epoch) {
      // Recovery answers a client that knew another host; this one already follows the stream.
      return;
    }
    const before = this.doc();
    const { patches, refused } = this.#client.recover(
      event.entries.map((entry) => ({
        ops: entry.ops.filter(Op.is),
        heads: entry.heads,
        ...(entry.origin ? { origin: entry.origin } : {}),
      })),
      event.version,
      event.heads,
    );
    this.#epoch = event.epoch;
    this.#copy = false;
    this.#followsCopy = false;
    if (patches.length > 0) {
      this.#emitHostChange(before, patches);
    }
    this.#emitRefused(refused);
    this.confirmed.emit();
  }

  /**
   * Shows the document as the host's copy holds it. Its heads are where a live subscription resumes
   * from on the first write, so edits made meanwhile are rebased over anything newer.
   */
  #applyCopy(event: Extract<Contract.DocumentEvent, { type: 'copy' }>): void {
    if (this.#client && !(this.#copy && this.#followsCopy)) {
      // Live already, or switching to live, whose answer settles the document.
      return;
    }
    const before = this.doc();
    // Structured-clone data from the host; T is the caller's promise about its shape.
    const value = Op.freeze(event.value as T);
    let patches: Op.Patch[];
    if (this.#client) {
      ({ patches } = this.#client.reset(value, 0, event.heads));
    } else {
      this.#client = new Sync.ClientState<T>(this.#clientId, value, 0, event.heads);
      for (const change of this.#early) {
        this.#client.applyLocal(change);
      }
      this.#early = [];
      patches = topLevelPuts(this.#client.current);
    }
    this.#epoch = COPY_EPOCH;
    this.#copy = true;
    this.#wakeReady();
    this.#emitHostChange(before, patches);
    this.confirmed.emit();
  }

  #applyCaughtUp(event: Extract<Contract.DocumentEvent, { type: 'caughtUp' }>): void {
    if (!this.#client || event.epoch !== this.#epoch) {
      return;
    }
    if (event.version !== this.#client.version) {
      // The in-flight batch stays unsettled rather than risk sending it twice.
      log.warn('caught-up marker does not match the entries received', {
        documentId: this.#documentId,
        expected: event.version,
        actual: this.#client.version,
      });
      return;
    }
    this.#client.requeue();
    this.confirmed.emit();
  }

  #view(): Doc<T> {
    return register(this.#client?.current ?? this.#local, this.#client?.heads ?? []);
  }

  #emitRefused(refused: readonly Op.Change[]): void {
    if (refused.length > 0) {
      this.refused.emit([...refused]);
    }
  }

  #emitHostChange(before: Doc<T>, patches: Op.Patch[]): void {
    const after = this.doc();
    this.emit('change', {
      handle: this,
      doc: after,
      patches: toPatches(patches),
      patchInfo: { before, after, source: 'host' },
    });
  }

  #wakeReady(): void {
    const recovered = this.#state === 'unavailable';
    if (this.#ready.state === TriggerState.REJECTED) {
      this.#ready.reset();
    }
    this.#state = 'ready';
    this.#ready.wake();
    if (recovered) {
      this.emit('available', { handle: this });
    }
    if (this.#stored.state !== TriggerState.RESOLVED) {
      this.#stored.wake(true);
    }
  }
}

/** Patches announcing a whole document, as a first Automerge delivery reports it. */
const topLevelPuts = (root: unknown): Op.Patch[] =>
  Op.isContainer(root) && !Array.isArray(root)
    ? Object.entries(root).map(([key, value]) => ({ action: 'put', path: [key], value }))
    : [];

type PatchValue = Extract<Patch, { action: 'put' }>['value'];

const toPatchValue = (value: unknown): PatchValue => (value === undefined ? null : value);

/** An empty container of the same kind, as Automerge reports a new object before filling it. */
const emptyOf = (value: unknown): PatchValue =>
  Array.isArray(value) ? [] : Op.isContainer(value) ? {} : toPatchValue(value);

/**
 * Appends patches creating `value` at `path` the way Automerge reports it: an empty container,
 * then one patch per nested key or element, so listeners that look for `['objects', id, ...]`
 * see an object that arrived as part of a larger write.
 */
const expandPut = (path: (string | number)[], value: unknown, out: Patch[]): void => {
  out.push({ action: 'put', path, value: emptyOf(value) });
  expandChildren(path, value, out);
};

const expandChildren = (path: (string | number)[], value: unknown, out: Patch[]): void => {
  if (Array.isArray(value)) {
    if (value.length > 0) {
      expandInsert([...path, 0], value, out);
    }
  } else if (Op.isContainer(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (Op.isContainer(child)) {
        expandPut([...path, key], child, out);
      } else {
        out.push({ action: 'put', path: [...path, key], value: toPatchValue(child) });
      }
    }
  }
};

const expandInsert = (path: (string | number)[], values: readonly unknown[], out: Patch[]): void => {
  out.push({ action: 'insert', path, values: values.map(emptyOf) });
  const listPath = path.slice(0, -1);
  const start = Number(path[path.length - 1]);
  values.forEach((value, offset) => expandChildren([...listPath, start + offset], value, out));
};

/** Proxy patches in Automerge's patch type and shape, for listeners written against Automerge handles. */
const toPatches = (patches: readonly Op.Patch[]): Patch[] => {
  const out: Patch[] = [];
  for (const patch of patches) {
    switch (patch.action) {
      case 'put':
        expandPut(patch.path, patch.value, out);
        break;
      case 'del':
        out.push(
          patch.length === undefined
            ? { action: 'del', path: patch.path }
            : { action: 'del', path: patch.path, length: patch.length },
        );
        break;
      case 'insert':
        expandInsert(patch.path, patch.values, out);
        break;
      case 'splice':
        out.push({ action: 'splice', path: patch.path, value: patch.value });
        break;
    }
  }
  return out;
};
