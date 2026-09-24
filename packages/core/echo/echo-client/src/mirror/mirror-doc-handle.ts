//
// Copyright 2026 DXOS.org
//

import type { Doc as AutomergeDoc, ChangeFn, ChangeOptions, Heads, Patch } from '@automerge/automerge';
import { type AutomergeUrl, type DocumentId, stringifyAutomergeUrl } from '@automerge/automerge-repo';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { EventEmitter } from 'eventemitter3';

import { Event, Trigger, TriggerState } from '@dxos/async';
import { Mirror } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type MirrorService } from '@dxos/protocols/rpc';

import {
  type ClientDocHandle,
  type ClientDocHandleEvents,
  type DiskSettlement,
  type DocHandleProxyState,
} from '../automerge/client-handle.ts';
import { DocumentUnavailableError } from '../errors.ts';
import { registerMirrorDoc } from './doc-ops.ts';
import { Recorder } from './recorder.ts';

export type MirrorDocHandleOptions<T> = {
  clientId: string;
  documentId?: DocumentId;
  /** Content of a document this tab is creating; edits made before the worker answers are kept. */
  initialValue?: T;
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
  readonly refused = new Event<Mirror.Change[]>();

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
  #client?: Mirror.MirrorClientState<T>;
  /** State before the worker's first snapshot: the initial value of a document being created. */
  #local: T;
  /** Changes made before the worker's first snapshot. */
  #early: Mirror.Op[][] = [];
  #deleted = false;
  /** Created by this tab, so flush waits for the worker's first snapshot of it. */
  readonly #created: boolean;

  constructor({ clientId, documentId, initialValue, onDelete }: MirrorDocHandleOptions<T>) {
    super();
    this.#clientId = clientId;
    this.#documentId = documentId;
    this.#onDelete = onDelete;
    this.#created = initialValue !== undefined;
    // Wire and caller data become the mirror's frozen state; T is the caller's promise about its shape.
    this.#local = Mirror.freezeValue((initialValue ?? {}) as T);
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
  get pendingOps(): Mirror.Op[] {
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
    const recorder = new Recorder<AutomergeDoc<T>>(before);
    // The draft emulates the document the callback expects; its type cannot be derived from a Proxy.
    callback(recorder.draft() as T);
    if (recorder.ops.length === 0) {
      return;
    }
    let patches: Mirror.MirrorPatch[];
    if (this.#client) {
      patches = this.#client.applyLocal(recorder.ops);
    } else {
      ({ root: this.#local, patches } = Mirror.applyOps(this.#local, recorder.ops));
      this.#early.push([...recorder.ops]);
    }
    const after = this.doc();
    this.emit('change', {
      handle: this,
      doc: after,
      patches: toPatches(patches),
      patchInfo: { before, after, source: 'change' },
    });
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
  _known(): MirrorService.Known | undefined {
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
  _takeBatch(): { epoch: string; batch: Mirror.Batch } | undefined {
    if (!this.#client || !this.#epoch) {
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
  _receive(event: MirrorService.DocumentEvent): void {
    switch (event.type) {
      case 'snapshot':
        return this.#applySnapshot(event);
      case 'entry':
        return this.#applyEntry(event);
      case 'recovered':
        return this.#applyRecovered(event);
      case 'caughtUp':
        return this.#applyCaughtUp(event);
      case 'requesting':
        return this._markRequesting();
      case 'unavailable':
        return this._markUnavailable(event.documentId);
    }
  }

  #applySnapshot(event: Extract<MirrorService.DocumentEvent, { type: 'snapshot' }>): void {
    const before = this.doc();
    // Structured-clone data from the worker; T is the database layer's promise about its shape.
    const value = Mirror.freezeValue(event.value as T);
    this.#epoch = event.epoch;
    let patches: Mirror.MirrorPatch[];
    let refused: Mirror.Change[] = [];
    if (this.#client) {
      ({ patches, refused } = this.#client.reset(
        value,
        event.version,
        event.heads,
        event.applied ?? false,
        event.refusedAt,
      ));
    } else {
      this.#client = new Mirror.MirrorClientState<T>(this.#clientId, value, event.version, event.heads);
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

  #applyEntry(event: Extract<MirrorService.DocumentEvent, { type: 'entry' }>): void {
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
      ops: event.entry.ops.filter(Mirror.isOp),
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

  #applyRecovered(event: Extract<MirrorService.DocumentEvent, { type: 'recovered' }>): void {
    if (!this.#client || event.epoch === this.#epoch) {
      // Recovery answers a tab that knew another worker; this one already follows the stream.
      return;
    }
    const before = this.doc();
    const { patches, refused } = this.#client.recover(
      event.entries.map((entry) => ({
        ops: entry.ops.filter(Mirror.isOp),
        heads: entry.heads,
        ...(entry.origin ? { origin: entry.origin } : {}),
      })),
      event.version,
      event.heads,
    );
    this.#epoch = event.epoch;
    if (patches.length > 0) {
      this.#emitHostChange(before, patches);
    }
    this.#emitRefused(refused);
    this.confirmed.emit();
  }

  #applyCaughtUp(event: Extract<MirrorService.DocumentEvent, { type: 'caughtUp' }>): void {
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

  #emitRefused(refused: readonly Mirror.Change[]): void {
    if (refused.length > 0) {
      this.refused.emit([...refused]);
    }
  }

  #emitHostChange(before: AutomergeDoc<T>, patches: Mirror.MirrorPatch[]): void {
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
const topLevelPuts = (root: unknown): Mirror.MirrorPatch[] =>
  Mirror.isContainer(root) && !Array.isArray(root)
    ? Object.entries(root).map(([key, value]) => ({ action: 'put', path: [key], value }))
    : [];

type PatchValue = Extract<Patch, { action: 'put' }>['value'];

const toPatchValue = (value: unknown): PatchValue => (value === undefined ? null : value);

/** An empty container of the same kind, as Automerge reports a new object before filling it. */
const emptyOf = (value: unknown): PatchValue =>
  Array.isArray(value) ? [] : Mirror.isContainer(value) ? {} : toPatchValue(value);

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
  } else if (Mirror.isContainer(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (Mirror.isContainer(child)) {
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
const toPatches = (patches: readonly Mirror.MirrorPatch[]): Patch[] => {
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
