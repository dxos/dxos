//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type AutomergeUrl, type DocumentId, stringifyAutomergeUrl } from '@automerge/automerge-repo';
import { EventEmitter } from 'eventemitter3';

import { Trigger, TriggerState } from '@dxos/async';
import { BACKED_OBJECT_LIMIT } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { DocumentUnavailableError } from '../errors.ts';
import * as Doc from './Doc.ts';
import { sameHeads } from './heads.ts';

export type ChangeEvent<T> = {
  handle: DocHandleProxy<T>;
  doc: A.Doc<T>;
  patches: A.Patch[];
  /**
   * `change` is a change made on this thread; `host` is bytes the worker delivered on their own;
   * `bulk` is bytes the worker delivered as part of a large batch, such as a first sync.
   */
  patchInfo: { before: A.Doc<T>; after: A.Doc<T>; source: 'change' | 'host' | 'bulk' };
};

export type ClientDocHandleEvents<T> = {
  change: ChangeEvent<T>;
  delete: { handle: DocHandleProxy<T> };
  /**
   * The handle left `'unavailable'` because the document's bytes finally arrived. Emitted only on
   * that transition: a waiter failed by {@link DocHandleProxy._markUnavailable} holds a rejected
   * promise and has nothing else to wake it.
   */
  available: { handle: DocHandleProxy<T> };
  /**
   * A passive handle took a change from the host: what its document's one object now shows, read at
   * `heads`. No `json` when the object cannot be shown without loading the document.
   */
  passive: { handle: DocHandleProxy<T>; heads: A.Heads; json?: string; updatedAt?: number };
};

/**
 * A document's stored changes, held on the JS heap unloaded, and the heads the client shows it at. The
 * changes can be ahead of those heads, never behind, and all came from the host, so the host holds them.
 */
export type PassiveDocument = { bytes: Uint8Array; heads: A.Heads };

export type DocHandleProxyOptions<T> = {
  initialValue?: T;
  documentId?: DocumentId;
  /** Bytes the client already holds: the handle starts passive and loads them on first use. */
  passive?: PassiveDocument;
  onDelete: () => void;
  /** Called once a passive handle has loaded its bytes, so it can be subscribed from their heads. */
  onActivate?: (heads: A.Heads) => void;
};

/**
 * Lifecycle of {@link DocHandleProxy}.
 *
 * - `'passive'`  — the client holds the document's stored changes unloaded, subscribed for the host's
 *                  changes with its object's JSON; {@link DocHandleProxy.doc} loads them synchronously,
 *                  and the handle is usable at once and `'ready'` once the host confirms it is current.
 * - `'pending'`  — handle just created; the worker has not yet reported the
 *                  outcome of the local-storage probe.
 * - `'requesting'` — worker confirmed the doc is **not** on disk and is
 *                    currently fetching it over the network.
 * - `'ready'`    — doc bytes are loaded and the handle is usable.
 * - `'unavailable'` — the host reported it cannot produce the doc at all;
 *                     {@link DocHandleProxy.whenReady} rejects rather than
 *                     waiting on bytes nothing is fetching.
 */
export type DocHandleProxyState = 'passive' | 'pending' | 'requesting' | 'ready' | 'unavailable';

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
 * blocking on the network. A host that has no bytes and nothing to fetch
 * them from settles the handle `'unavailable'` instead
 * ({@link _markUnavailable}), which is terminal only until bytes actually
 * arrive.
 */
export class DocHandleProxy<T> extends EventEmitter<ClientDocHandleEvents<T>> implements Doc.Handle<T> {
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
  /** {@link url} for {@link _documentId}; the base58check encode behind it hashes twice per call. */
  #url?: { documentId: DocumentId; url: AutomergeUrl } = undefined;
  private readonly _onDelete: () => void;
  #onActivate?: (heads: A.Heads) => void;
  /**
   * Set while passive: the stored changes as received, joined only when read or loaded, kept off the wasm
   * heap, which never shrinks, until something reads or writes.
   */
  #passive?: { chunks: Uint8Array[]; size: number; heads: A.Heads } = undefined;
  #loadedFromBytes = false;

  constructor({ documentId, initialValue, passive, onDelete, onActivate }: DocHandleProxyOptions<T>) {
    super();
    this._documentId = documentId;
    this._onDelete = onDelete;
    this.#onActivate = onActivate;
    if (passive) {
      this.#passive = { chunks: [passive.bytes], size: passive.bytes.length, heads: passive.heads };
      this._state = 'passive';
    } else if (initialValue) {
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
    if (!this._documentId) {
      return undefined;
    }
    if (this.#url?.documentId !== this._documentId) {
      this.#url = { documentId: this._documentId, url: stringifyAutomergeUrl(this._documentId) };
    }
    return this.#url.url;
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

  /** The stored changes and shown heads of a passive handle; undefined once loaded. */
  get passive(): PassiveDocument | undefined {
    const passive = this.#passive;
    return passive && { bytes: joinChunks(passive), heads: passive.heads };
  }

  /** The heads a passive handle shows, without joining its stored changes; undefined once loaded. */
  get passiveHeads(): A.Heads | undefined {
    return this.#passive?.heads;
  }

  /** Loads a passive handle's bytes. */
  doc(): A.Doc<T> {
    this._activate();
    if (!this._doc) {
      throw new Error('DocHandleProxy.doc called on deleted doc');
    }
    return this._doc;
  }

  /**
   * Resolves once the doc's bytes are loaded.
   * Rejects with {@link DocumentUnavailableError} if the host reports it cannot produce the doc.
   */
  async whenReady(): Promise<void> {
    this._activate();
    await this._ready.wait();
  }

  isReady(): boolean {
    return this._ready.state === TriggerState.RESOLVED;
  }

  /** Whether the document can be read and written now: ready, or loaded from bytes the client held. */
  isLoaded(): boolean {
    return this.isReady() || (this.#loadedFromBytes && this.#passive === undefined && this._doc !== undefined);
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
    this._activate();
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
    this._activate();
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
    this._activate();
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
  _activate({ at }: { at?: A.Heads } = {}): void {
    const passive = this.#passive;
    if (!passive) {
      return;
    }
    this.#passive = undefined;
    this.#loadedFromBytes = true;
    // Stored chunks, a snapshot and the incremental changes after it, which `load` does not take in any order.
    const stored = A.loadIncremental<T>(A.init<T>(), joinChunks(passive));
    const storedHeads = A.getHeads(stored);
    if (at && A.hasHeads(stored, at) && !sameHeads(at, storedHeads)) {
      this._doc = A.clone(A.view(stored, at));
      const after = A.saveSince(stored, at);
      A.free(stored);
      queueMicrotask(() => this.#catchUp(after, { at, storedHeads }));
    } else {
      this._doc = stored;
    }
    this._lastSentHeads = A.getHeads(this._doc);
    this._state = 'pending';
    if (this._ready.state !== TriggerState.WAITING) {
      this._ready.reset();
    }
    this.#onActivate?.(storedHeads);
  }

  #catchUp(changes: Uint8Array, { at, storedHeads }: { at: A.Heads; storedHeads: A.Heads }): void {
    if (!this._doc) {
      return;
    }
    const before = this._doc;
    const headsBefore = A.getHeads(this._doc);
    this._doc = A.loadIncremental(this._doc, changes);
    if (sameHeads(this._lastSentHeads, at)) {
      this._lastSentHeads = storedHeads;
    }
    try {
      this.emit('change', {
        handle: this,
        doc: this._doc,
        patches: A.diff(this._doc, headsBefore, A.getHeads(this._doc)),
        patchInfo: { before, after: this._doc, source: 'host' },
      });
    } catch (err) {
      log.catch(err);
    }
  }

  /**
   * @internal
   */
  _setPassive(passive: PassiveDocument): void {
    invariant(this.#passive, 'Only a passive handle takes other stored changes.');
    this.#passive = { chunks: [passive.bytes], size: passive.bytes.length, heads: passive.heads };
  }

  /**
   * @internal
   */
  _setDocumentId(documentId: DocumentId): void {
    this._documentId = documentId;
  }

  /**
   * Settles `whenReady` with the error that stopped the document from being created.
   * @internal
   */
  _failReady(error: Error): void {
    this._ready.throw(error);
  }

  /**
   * @internal
   */
  _wakeReady(): void {
    // Bytes arriving after an `unavailable` verdict (replication catching up) supersede it; the
    // rejected trigger is inert, so it is re-armed before waking or later waiters keep the error.
    const recovered = this._state === 'unavailable';
    if (this._ready.state === TriggerState.REJECTED) {
      this._ready.reset();
    }
    this._state = 'ready';
    this._ready.wake();
    if (recovered) {
      this.emit('available', { handle: this });
    }
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
   * Mark the handle as `'unavailable'`: the host cannot produce this document and is not fetching
   * it, so every waiter is failed rather than left parked — a load that cannot complete must say so
   * at the call site instead of expiring against some caller's timeout. No-op once the handle is
   * `'ready'`; a later delivery of the bytes takes it back to `'ready'` via {@link _wakeReady}.
   * @param documentId The id the host reported on, which a handle created locally does not yet have.
   * @internal
   */
  _markUnavailable(documentId: string): void {
    if (this._state === 'ready') {
      return;
    }
    this._state = 'unavailable';
    this._ready.throw(new DocumentUnavailableError({ documentId }));
    // A document the host cannot produce is not on its disk either, so disk-only callers settle too.
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
   * Whether every local change has been acknowledged by the host — the condition for dropping this
   * handle from memory. `_getPendingChanges` clears the repo's pending-id set before the mutation is
   * actually sent, so that set alone cannot answer this: a handle dropped in the window between
   * would take an unsent write with it.
   * @internal
   */
  _isAcknowledged(): boolean {
    return this._doc !== undefined && A.equals(A.getHeads(this._doc), this._lastSentHeads);
  }

  /**
   * Confirm that the last write was successful.
   * @internal
   */
  _confirmSync(): void {
    this._lastSentHeads = this._currentlySendingHeads;
  }

  /**
   * @internal
   */
  _integratePassiveUpdate(
    mutation: Uint8Array | undefined,
    passive: { heads: A.Heads; json?: string; updatedAt?: number } | undefined,
  ): void {
    const held = this.#passive;
    invariant(held, 'Not a passive handle.');
    if (mutation?.length) {
      held.chunks.push(mutation);
      held.size += mutation.length;
    }
    const json = held.size <= BACKED_OBJECT_LIMIT ? passive?.json : undefined;
    if (json !== undefined) {
      held.heads = passive!.heads;
    }
    this.emit('passive', { handle: this, heads: held.heads, json, updatedAt: passive?.updatedAt });
  }

  /**
   * Update the doc with a foreign mutation from worker.
   * @internal
   */
  _integrateHostUpdate(mutation: Uint8Array | undefined, { bulk = false }: { bulk?: boolean } = {}): void {
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

    // The host echoes a client's own mutation back over its subscription as a separate change; it
    // merges cleanly and moves the heads but alters nothing, so emitting for it would report a
    // change that did not happen — a listener waiting for the *next* remote edit would be woken by
    // its own. Patches, not heads, are the test: a merge can advance the heads without touching any
    // value.
    const patches = A.diff(this._doc, headsBefore, A.getHeads(this._doc));
    if (patches.length === 0) {
      return;
    }

    this.emit('change', {
      handle: this,
      doc: this._doc,
      patches,
      patchInfo: { before, after: this._doc, source: bulk ? 'bulk' : 'host' },
    });
  }
}

const joinChunks = (passive: { chunks: Uint8Array[]; size: number }): Uint8Array => {
  if (passive.chunks.length !== 1) {
    const bytes = new Uint8Array(passive.size);
    let offset = 0;
    for (const chunk of passive.chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    passive.chunks = [bytes];
  }
  return passive.chunks[0];
};
