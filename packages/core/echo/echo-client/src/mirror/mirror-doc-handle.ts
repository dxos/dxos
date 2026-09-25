//
// Copyright 2026 DXOS.org
//

import type { Doc as AutomergeDoc, ChangeFn, ChangeOptions, Heads, Patch } from '@automerge/automerge';
import { type AutomergeUrl, type DocumentId, stringifyAutomergeUrl } from '@automerge/automerge-repo';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { EventEmitter } from 'eventemitter3';

import { Event, Trigger, TriggerState } from '@dxos/async';
import { Contract, Draft, Op, Sync } from '@dxos/automerge-proxy';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import {
  type ClientDocHandle,
  type ClientDocHandleEvents,
  type DiskSettlement,
  type DocHandleProxyState,
} from '../automerge/client-handle.ts';
import { DocumentUnavailableError } from '../errors.ts';
import { registerMirrorDoc } from './doc-ops.ts';

/** Names the state of a document read from the index, which no worker numbering ever uses. */
const INDEXED_EPOCH = 'indexed';

/** Opens and closes real Automerge replicas of documents, for {@link MirrorDocHandle.leaseReplica}. */
export type ReplicaSource = {
  open: <T>(documentId: DocumentId) => Promise<ClientDocHandle<T>>;
  close: (documentId: DocumentId) => void;
};

/** A replica held until released; see {@link MirrorDocHandle.leaseReplica}. */
export type ReplicaLease<T> = {
  readonly ready: Promise<ClientDocHandle<T>>;
  release(): void;
};

export type MirrorDocHandleOptions<T> = {
  clientId: string;
  documentId?: DocumentId;
  /** Content of a document this tab is creating; edits made before the worker answers are kept. */
  initialValue?: T;
  /** Follow the worker's index rather than its Automerge copy until the tab first writes. */
  indexed?: boolean;
  replicas?: ReplicaSource;
  onDelete: () => void;
};

/**
 * A document handle over a JSON mirror: the tab holds the state the worker confirmed plus its own
 * unconfirmed edits, and no Automerge document.
 *
 * Reads and writes stay synchronous. What changes is heads: they are the last confirmed ones, so a
 * write moves them only once the worker has applied and saved it.
 */
export class MirrorDocHandle<T> extends EventEmitter<ClientDocHandleEvents<T>> implements ClientDocHandle<T> {
  readonly _internalId = PublicKey.random().toHex();

  /** Fires when the worker confirms a batch or the handle catches up; flush waits on it. */
  readonly confirmed = new Event<void>();

  /** Fires when an entry skips versions; resubscribing from this tab's version fills the gap. */
  readonly gap = new Event<void>();

  /** Fires with this tab's changes the worker refused, before the {@link confirmed} that settles them. */
  readonly refused = new Event<Op.Change[]>();

  /** Fires on the tab's first write to a document that follows the index, which needs the worker's copy to land. */
  readonly upgrade = new Event<void>();

  /**
   * The document as an atom whose value is the frozen tree {@link doc} returns, not a copy of it, so an
   * atom derived from a subtree sees an unchanged subtree as the same value and does not notify.
   */
  readonly atom: Atom.Atom<AutomergeDoc<T>> = Atom.make((get) => {
    const update = () => get.setSelf(this.#view());
    this.on('change', update);
    get.addFinalizer(() => this.off('change', update));
    return this.#view();
  });

  readonly #clientId: string;
  readonly #onDelete: () => void;
  readonly #ready = new Trigger();
  readonly #settledOnDisk = new Trigger<DiskSettlement>();
  #state: DocHandleProxyState = 'pending';
  #documentId?: DocumentId;
  #epoch?: string;
  #client?: Sync.ClientState<T>;
  /** State before the worker's first snapshot: the initial value of a document being created. */
  #local: T;
  /** Changes made before the worker's first snapshot. */
  #early: Op.Any[][] = [];
  #deleted = false;
  /** Read from the worker's index: shown, but not written until the worker's copy answers. */
  #indexed = false;
  /** Until the first write or a live answer, since a live handle ignores index copies and must not ask for them. */
  #followsIndex: boolean;
  /** Created by this tab, so flush waits for the worker's first snapshot of it. */
  readonly #created: boolean;
  readonly #replicas?: ReplicaSource;
  /** Callers holding a {@link leaseReplica}; the replica closes with the last one. */
  #replicaUsers = 0;
  #replicaOpening?: Promise<ClientDocHandle<T>>;
  #replica?: ClientDocHandle<T>;

  constructor({ clientId, documentId, initialValue, indexed = false, replicas, onDelete }: MirrorDocHandleOptions<T>) {
    super();
    this.#clientId = clientId;
    this.#documentId = documentId;
    this.#replicas = replicas;
    this.#onDelete = onDelete;
    this.#created = initialValue !== undefined;
    this.#followsIndex = indexed;
    // Wire and caller data become the mirror's frozen state; T is the caller's promise about its shape.
    this.#local = Op.freeze((initialValue ?? {}) as T);
  }

  get url(): AutomergeUrl | undefined {
    return this.#documentId ? stringifyAutomergeUrl(this.#documentId) : undefined;
  }

  get documentId(): DocumentId | undefined {
    return this.#documentId;
  }

  get state(): DocHandleProxyState {
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

  /** A document this tab created that the worker has not sent back yet. */
  get awaitingCreation(): boolean {
    return this.#created && !this.isReady();
  }

  get isDeleted(): boolean {
    return this.#deleted;
  }

  /** Whether the document is still read from the index, with no live subscription to the worker. */
  get isIndexed(): boolean {
    return this.#indexed;
  }

  /** Whether (re)subscriptions should ask for the worker's index rather than its Automerge copy. */
  get followsIndex(): boolean {
    return this.#followsIndex;
  }

  /** The replica a {@link leaseReplica} holds, once it has loaded. */
  get replica(): ClientDocHandle<T> | undefined {
    return this.#replica;
  }

  /**
   * Holds a real Automerge replica of this document until released, for code that needs the
   * Automerge API; the mirror carries on as before. A document this tab created opens once the worker
   * has named it.
   */
  leaseReplica(): ReplicaLease<T> | undefined {
    const replicas = this.#replicas;
    if (!replicas) {
      return undefined;
    }
    this.#replicaUsers++;
    if (!this.#replicaOpening) {
      const opening: Promise<ClientDocHandle<T>> = this.#named()
        .then((documentId) => replicas.open<T>(documentId))
        .then(
          (replica) => {
            if (this.#replicaOpening === opening) {
              this.#replica = replica;
            }
            return replica;
          },
          (error) => {
            if (this.#replicaOpening === opening) {
              this.#replicaOpening = undefined;
            }
            throw error;
          },
        );
      this.#replicaOpening = opening;
    }
    const ready = this.#replicaOpening;
    let released = false;
    return {
      ready,
      release: () => {
        if (released) {
          return;
        }
        released = true;
        if (--this.#replicaUsers > 0) {
          return;
        }
        this.#replicaOpening = undefined;
        this.#replica = undefined;
        // Unless a new lease reopened it in the meantime.
        void ready.then(
          () => {
            if (!this.#replicaOpening && this.#documentId) {
              replicas.close(this.#documentId);
            }
          },
          () => {},
        );
      },
    };
  }

  /** The document's id, which a document this tab created has once the worker's first snapshot arrives. */
  async #named(): Promise<DocumentId> {
    if (!this.#documentId) {
      await this.whenReady();
    }
    invariant(this.#documentId, 'a ready mirror handle names its document');
    return this.#documentId;
  }

  doc(): AutomergeDoc<T> {
    invariant(!this.#deleted, 'MirrorDocHandle.doc called on deleted doc');
    return this.#view();
  }

  async whenReady(): Promise<void> {
    await this.#ready.wait();
  }

  isReady(): boolean {
    return this.#ready.state === TriggerState.RESOLVED;
  }

  async whenSettledOnDisk(): Promise<DiskSettlement> {
    return this.#settledOnDisk.wait();
  }

  change(callback: ChangeFn<T>, _options?: ChangeOptions<T>): void {
    invariant(!this.#deleted, 'MirrorDocHandle.change called on deleted doc');
    const before = this.doc();
    const recorder = new Draft.Recorder<AutomergeDoc<T>>(before);
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
    if (this.#followsIndex) {
      this.#followsIndex = false;
      this.upgrade.emit();
    }
  }

  /**
   * Writes against the current state when `heads` are current. A mirror cannot write against older
   * heads, since that needs the Automerge history the worker holds.
   */
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): Heads | undefined {
    const current = this.heads;
    if (this.hasPending || heads.length !== current.length || heads.some((head) => !current.includes(head))) {
      throw new Error('changeAt against older heads is not supported by a mirror handle');
    }
    this.change(callback, options);
    return undefined;
  }

  update(): void {
    throw new Error('Replacing a document is not supported by a mirror handle');
  }

  delete(): void {
    this.#onDelete();
    this.emit('delete', { handle: this });
    this.#deleted = true;
  }

  /** What the tab holds, sent when resubscribing so the worker can send only what it missed. */
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
    if (!this.#client || !this.#epoch || this.#indexed) {
      return undefined;
    }
    const batch = this.#client.takeBatch(`${this.#clientId}:${PublicKey.random().toHex().slice(0, 16)}`);
    return batch ? { epoch: this.#epoch, batch } : undefined;
  }

  /** @internal */
  _setDocumentId(documentId: DocumentId): void {
    this.#documentId = documentId;
  }

  /** @internal */
  _failReady(error: Error): void {
    this.#ready.throw(error);
  }

  /** Not on the worker's disk: disk-only callers settle now; the document may still arrive. */
  _markRequesting(): void {
    if (this.#state !== 'pending') {
      return;
    }
    this.#state = 'requesting';
    if (this.#settledOnDisk.state !== TriggerState.RESOLVED) {
      this.#settledOnDisk.wake(false);
    }
  }

  /** @internal */
  _markUnavailable(documentId: string): void {
    if (this.#state === 'ready') {
      return;
    }
    this.#state = 'unavailable';
    this.#ready.throw(new DocumentUnavailableError({ documentId }));
    if (this.#settledOnDisk.state !== TriggerState.RESOLVED) {
      this.#settledOnDisk.wake(false);
    }
  }

  /** Integrates an event from the worker. */
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
        return this.#applyIndexed(event);
      case 'requesting':
        return this._markRequesting();
      case 'unavailable':
        return this._markUnavailable(event.documentId);
    }
  }

  #applySnapshot(event: Extract<Contract.DocumentEvent, { type: 'snapshot' }>): void {
    const before = this.doc();
    // Structured-clone data from the worker; T is the database layer's promise about its shape.
    const value = Op.freeze(event.value as T);
    this.#epoch = event.epoch;
    this.#indexed = false;
    this.#followsIndex = false;
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
      // Recovery answers a tab that knew another worker; this one already follows the stream.
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
    this.#indexed = false;
    this.#followsIndex = false;
    if (patches.length > 0) {
      this.#emitHostChange(before, patches);
    }
    this.#emitRefused(refused);
    this.confirmed.emit();
  }

  /**
   * Shows the document as the worker's index holds it. Its heads are where a live subscription
   * resumes from on the first write, so edits made meanwhile are rebased over anything newer.
   */
  #applyIndexed(event: Extract<Contract.DocumentEvent, { type: 'copy' }>): void {
    if (this.#client && !(this.#indexed && this.#followsIndex)) {
      // Live already, or switching to live, whose answer settles the document.
      return;
    }
    const before = this.doc();
    // Structured-clone data from the worker; T is the database layer's promise about its shape.
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
    this.#epoch = INDEXED_EPOCH;
    this.#indexed = true;
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

  #view(): AutomergeDoc<T> {
    return registerMirrorDoc(this.#client?.current ?? this.#local, this.#client?.heads ?? []);
  }

  #emitRefused(refused: readonly Op.Change[]): void {
    if (refused.length > 0) {
      this.refused.emit([...refused]);
    }
  }

  #emitHostChange(before: AutomergeDoc<T>, patches: Op.Patch[]): void {
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
    if (this.#settledOnDisk.state !== TriggerState.RESOLVED) {
      this.#settledOnDisk.wake(true);
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

/** Mirror patches in Automerge's patch type and shape, for listeners written against Automerge handles. */
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
