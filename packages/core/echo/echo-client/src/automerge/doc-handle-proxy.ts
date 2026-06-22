//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type AutomergeUrl, type DocumentId, stringifyAutomergeUrl } from '@automerge/automerge-repo';
import { EventEmitter } from 'eventemitter3';

import { Trigger, TriggerState } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { type Handle } from './types';

export type ChangeEvent<T> = {
  handle: DocHandleProxy<T>;
  doc: A.Doc<T>;
  patches: A.Patch[];
  patchInfo: { before: A.Doc<T>; after: A.Doc<T>; source: 'change' };
};

export type ClientDocHandleEvents<T> = {
  change: ChangeEvent<T>;
  delete: { handle: DocHandleProxy<T> };
};

export type DocHandleProxyOptions<T> = {
  initialValue?: T;
  documentId?: DocumentId;
  onDelete: () => void;
};

/**
 * Lifecycle of {@link DocHandleProxy}.
 *
 * - `'pending'`  — handle just created; the worker has not yet reported the
 *                  outcome of the local-storage probe.
 * - `'requesting'` — worker confirmed the doc is **not** on disk and is
 *                    currently fetching it over the network.
 * - `'ready'`    — doc bytes are loaded and the handle is usable.
 */
export type DocHandleProxyState = 'pending' | 'requesting' | 'ready';

/**
 * Settled state of the worker-side disk probe.
 * `true` means the worker had the doc on disk and the handle is now `'ready'`.
 * `false` means the worker did not find the doc on disk and is now requesting
 * it over the network (handle is `'requesting'`).
 */
export type DiskSettlement = boolean;

/**
 * A client-side `Handle` implementation.
 * Syncs with a Automerge Repo in shared worker.
 * Inspired by Automerge's `DocHandle`.
 *
 * Lifecycle: `'pending' → 'requesting'? → 'ready'`. The handle starts in
 * `'pending'`. The worker probes its local storage and either delivers the
 * doc bytes (handle becomes `'ready'`), or notifies the client that the doc
 * is not on disk and a network fetch has been started (handle becomes
 * `'requesting'`). It can later transition `'requesting' → 'ready'` if the
 * network ever delivers the bytes. Disk-only callers wait on
 * {@link whenSettledOnDisk} to learn the outcome of the disk probe without
 * blocking on the network.
 */
export class DocHandleProxy<T> extends EventEmitter<ClientDocHandleEvents<T>> implements Handle<T> {
  private readonly _ready = new Trigger();
  private readonly _settledOnDisk = new Trigger<DiskSettlement>();
  private _state: DocHandleProxyState = 'pending';
  private _doc?: A.Doc<T> = undefined;

  private _lastSentHeads: A.Heads = [];
  /**
   * Heads that are currently being synced.
   * If sync is successful, they will be moved to `_lastSentHeads`.
   */
  private _currentlySendingHeads: A.Heads = [];
  /**
   * Identifier for internal usage.
   * @internal
   */
  readonly _internalId = PublicKey.random().toHex();
  /**
   * Present if document is loading from a storage.
   * Undefined if document is new and still is being created.
   */
  private _documentId?: DocumentId;
  private readonly _onDelete: () => void;

  constructor({ documentId, initialValue, onDelete }: DocHandleProxyOptions<T>) {
    super();
    this._documentId = documentId;
    this._onDelete = onDelete;
    if (initialValue) {
      // T should really be constrained to extend `Record<string, unknown>` (an automerge doc can't be
      // e.g. a primitive, an array, etc. - it must be an object). But adding that constraint creates
      // a bunch of other problems elsewhere so for now we'll just cast it here to make Automerge happy.
      this._doc = A.from(initialValue as Record<string, unknown>) as T;
      this._doc = A.emptyChange<T>(this._doc);
    } else {
      this._doc = A.init<T>();
    }
  }

  /**
   * Returns the document URL, or undefined if documentId is not yet assigned.
   * For new documents, this is undefined until the document is created on the host.
   * For loaded documents, this is always defined.
   */
  get url(): AutomergeUrl | undefined {
    return this._documentId ? stringifyAutomergeUrl(this._documentId) : undefined;
  }

  /**
   * Returns the document ID, or undefined if not yet assigned.
   * For new documents, this is undefined until the document is created on the host.
   * For loaded documents, this is always defined.
   */
  get documentId(): DocumentId | undefined {
    return this._documentId;
  }

  get state(): DocHandleProxyState {
    return this._state;
  }

  doc(): A.Doc<T> {
    if (!this._doc) {
      throw new Error('DocHandleProxy.doc called on deleted doc');
    }
    return this._doc;
  }

  async whenReady(): Promise<void> {
    await this._ready.wait();
  }

  isReady(): boolean {
    return this._ready.state === TriggerState.RESOLVED;
  }

  /**
   * Resolves once the worker-side disk probe has settled — i.e. the handle
   * has transitioned out of `'pending'`. Returns `true` if the doc was on
   * disk (handle is now `'ready'`), `false` if it was not (handle is now
   * `'requesting'` while the worker continues to fetch over the network).
   * Use this for query-driven loads that should not block on network
   * latency: if it resolves with `false`, treat the doc as unavailable.
   */
  async whenSettledOnDisk(): Promise<DiskSettlement> {
    return this._settledOnDisk.wait();
  }

  change(fn: (doc: A.Doc<T>) => void, opts?: A.ChangeOptions<any>): void {
    invariant(this._doc, 'DocHandleProxy.change called on deleted doc');
    const before = this._doc;
    const headsBefore = A.getHeads(this._doc);
    this._doc = opts ? A.change(this._doc, opts, fn) : A.change(this._doc, fn);
    this.emit('change', {
      handle: this,
      doc: this._doc,
      patches: A.diff(this._doc, headsBefore, A.getHeads(this._doc)),
      patchInfo: { before, after: this._doc, source: 'change' },
    });
  }

  changeAt(heads: A.Heads, fn: (doc: A.Doc<T>) => void, opts?: A.ChangeOptions<any>): A.Heads | undefined {
    invariant(this._doc, 'DocHandleProxy.changeAt called on deleted doc');
    const before = this._doc;
    const headsBefore = A.getHeads(this._doc);
    const { newDoc, newHeads } = opts ? A.changeAt(this._doc, heads, opts, fn) : A.changeAt(this._doc, heads, fn);

    this._doc = newDoc;
    this.emit('change', {
      handle: this,
      doc: this._doc,
      patches: newHeads ? A.diff(this._doc, headsBefore, newHeads) : [],
      patchInfo: { before, after: this._doc, source: 'change' },
    });
    return newHeads ?? undefined;
  }

  update(updateCallback: (doc: A.Doc<T>) => A.Doc<T>): void {
    invariant(this._doc, 'DocHandleProxy.update called on deleted doc');
    const before = this._doc;
    const headsBefore = A.getHeads(this._doc);
    const newDoc = updateCallback(this._doc);
    invariant(newDoc, 'DocHandleProxy.update returned undefined doc');
    this._doc = newDoc;
    this.emit('change', {
      handle: this,
      doc: this._doc,
      patches: A.diff(this._doc, headsBefore, A.getHeads(this._doc)),
      patchInfo: { before, after: this._doc, source: 'change' },
    });
  }

  delete(): void {
    this._onDelete();
    this.emit('delete', { handle: this });
    this._doc = undefined;
  }

  /**
   * @internal
   */
  _setDocumentId(documentId: DocumentId): void {
    this._documentId = documentId;
  }

  /**
   * @internal
   */
  _wakeReady(): void {
    this._state = 'ready';
    this._ready.wake();
    // A `'ready'` outcome implies the doc was either on disk or arrived via
    // the network. Either way the disk probe is settled (`true` because the
    // handle ends up holding the doc, regardless of the actual source).
    if (this._settledOnDisk.state !== TriggerState.RESOLVED) {
      this._settledOnDisk.wake(true);
    }
  }

  /**
   * Mark the handle as `'requesting'`: worker-side disk probe completed and
   * the doc is not on local disk; the worker is now fetching it over the
   * network. Settles {@link whenSettledOnDisk} with `false`. No-op if the
   * handle is already `'ready'` or has already been marked `'requesting'`.
   * @internal
   */
  _markRequesting(): void {
    if (this._state !== 'pending') {
      return;
    }
    this._state = 'requesting';
    if (this._settledOnDisk.state !== TriggerState.RESOLVED) {
      this._settledOnDisk.wake(false);
    }
  }

  /**
   * Get pending changes since last write.
   * @internal
   */
  _getPendingChanges(): Uint8Array | undefined {
    invariant(this._doc, 'Doc is deleted, cannot get last write mutation');
    if (A.equals(A.getHeads(this._doc), this._lastSentHeads)) {
      return;
    }

    const mutation = A.saveSince(this._doc, this._lastSentHeads);
    if (mutation.length === 0) {
      return;
    }
    this._currentlySendingHeads = A.getHeads(this._doc);
    return mutation;
  }

  /**
   * Confirm that the last write was successful.
   * @internal
   */
  _confirmSync(): void {
    this._lastSentHeads = this._currentlySendingHeads;
  }

  /**
   * Update the doc with a foreign mutation from worker.
   * @internal
   */
  _integrateHostUpdate(mutation: Uint8Array | undefined): void {
    if (!mutation) {
      return;
    }
    invariant(this._doc, 'Doc is deleted, cannot write mutation');
    const before = this._doc;
    const headsBefore = A.getHeads(this._doc);
    this._doc = A.loadIncremental(this._doc, mutation);

    if (A.equals(headsBefore, this._lastSentHeads)) {
      this._lastSentHeads = A.getHeads(this._doc);
    }

    this._wakeReady();

    this.emit('change', {
      handle: this,
      doc: this._doc,
      patches: A.diff(this._doc, headsBefore, A.getHeads(this._doc)),
      patchInfo: { before, after: this._doc, source: 'change' },
    });
  }
}
