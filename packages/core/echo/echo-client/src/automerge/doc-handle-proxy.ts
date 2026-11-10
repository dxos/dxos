//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type AutomergeUrl, type DocumentId, stringifyAutomergeUrl } from '@automerge/automerge-repo';
import { EventEmitter } from 'eventemitter3';

import { Trigger, TriggerState } from '@dxos/async';
import { BACKED_DIRECTORY_LIMIT, BACKED_OBJECT_LIMIT } from '@dxos/echo-protocol';
import { runInCommit } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { countWork, markWork } from '@dxos/util';

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
  /** A passive handle loaded its stored changes; emitted once, before the call that loaded it returns. */
  activated: { handle: DocHandleProxy<T> };
};

/**
 * A document's stored changes, held on the JS heap unloaded, and the heads the client shows it at. The
 * changes can be ahead of those heads, never behind, and all came from the host, so the host holds them.
 */
export type PassiveDocument = { bytes: Uint8Array; heads: A.Heads };

/** A space directory held unloaded: its stored changes, the heads it is shown at, and its JSON at those heads. */
export type PassiveDirectory = PassiveDocument & { json?: string };

export type DocHandleProxyOptions<T> = {
  initialValue?: T;
  documentId?: DocumentId;
  /** Bytes the client already holds: the handle starts passive and loads them on first use. */
  passive?: PassiveDocument;
  /**
   * The handle holds a space directory: it keeps the JSON the host shows it with, under
   * {@link BACKED_DIRECTORY_LIMIT}, and without `passive` it starts passive and empty, shown once the host's first
   * send arrives (see {@link DocHandleProxy.whenPassiveShown}).
   */
  directory?: boolean | { json?: string };
  onDelete: () => void;
};

/** Stored changes held unloaded, off the wasm heap, which never shrinks. */
type PassiveBody = {
  readonly kind: 'passive';
  chunks: Uint8Array[];
  size: number;
  heads: A.Heads;
  /** A directory's JSON at {@link heads}, kept for a handle that holds a directory. */
  json?: string;
  /** Holds nothing yet: the host is asked for the whole document, and its first send fills the body. */
  awaiting?: boolean;
};

type LoadedBody<T> = {
  readonly kind: 'loaded';
  doc: A.Doc<T>;
  /** Heads of the changes the host holds; written by {@link DocHandleProxy.#hostHolds} once the body exists. */
  hostHeads: A.Heads;
  /** Heads of the mutation in flight, which the host's acknowledgement moves into {@link hostHeads}. */
  sending?: A.Heads;
  /** Loaded from stored changes the client held, so usable before the host's first send. */
  readonly fromBytes: boolean;
  /** Stored changes after the shown heads, folded in when the write scope that loaded the body closes. */
  catchUp?: { readonly after: Uint8Array; readonly heads: A.Heads };
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
  /** The state of a loaded body; a passive body reports `'passive'` through {@link state}. */
  private _state: Exclude<DocHandleProxyState, 'passive'> = 'pending';
  /** Undefined once deleted. */
  #body: PassiveBody | LoadedBody<T> | undefined;
  /** The last {@link _heldState} save of a loaded doc, reused while its heads are unchanged. */
  #saved?: PassiveDocument;
  /** Open write scopes; see {@link batch}. */
  #depth = 0;
  readonly #directory: boolean;
  /** Woken by the host's first send to a handle that started empty; see {@link whenPassiveShown}. */
  readonly #shown = new Trigger();
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

  constructor({ documentId, initialValue, passive, directory, onDelete }: DocHandleProxyOptions<T>) {
    super();
    this._documentId = documentId;
    this._onDelete = onDelete;
    this.#directory = directory !== undefined && directory !== false;
    const json = typeof directory === 'object' ? directory.json : undefined;
    if (passive) {
      this.#body = { kind: 'passive', chunks: [passive.bytes], size: passive.bytes.length, heads: passive.heads, json };
      this.#shown.wake();
    } else if (this.#directory) {
      this.#body = { kind: 'passive', chunks: [], size: 0, heads: [], awaiting: true };
    } else {
      // T should really be constrained to extend `Record<string, unknown>` (an automerge doc can't be
      // e.g. a primitive, an array, etc. - it must be an object). But adding that constraint creates
      // a bunch of other problems elsewhere so for now we'll just cast it here to make Automerge happy.
      const doc = initialValue ? A.emptyChange<T>(A.from(initialValue as Record<string, unknown>) as T) : A.init<T>();
      this.#body = { kind: 'loaded', doc, hostHeads: [], fromBytes: false };
      this.#shown.wake();
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
    return this.#body?.kind === 'passive' ? 'passive' : this._state;
  }

  /** The stored changes and shown heads of a passive handle; undefined once loaded. */
  get passive(): PassiveDocument | undefined {
    const body = this.#body;
    return body?.kind === 'passive' ? { bytes: joinChunks(body), heads: body.heads } : undefined;
  }

  /** The JSON a passive directory handle is shown with, read at {@link passiveHeads}; undefined once loaded. */
  get passiveJson(): string | undefined {
    const body = this.#body;
    return body?.kind === 'passive' ? body.json : undefined;
  }

  /**
   * Resolves once a passive handle that started empty holds the host's first send, at once for any other.
   * Rejects with {@link DocumentUnavailableError} if the host reports it cannot produce the document.
   */
  async whenPassiveShown(): Promise<void> {
    await this.#shown.wait();
  }

  /** The heads a passive handle shows, without joining its stored changes; undefined once loaded. */
  get passiveHeads(): A.Heads | undefined {
    const body = this.#body;
    return body?.kind === 'passive' ? body.heads : undefined;
  }

  /** Loads a passive handle's bytes. */
  doc(): A.Doc<T> {
    return this.#loaded().doc;
  }

  /**
   * Resolves once the doc's bytes are loaded.
   * Rejects with {@link DocumentUnavailableError} if the host reports it cannot produce the doc.
   */
  async whenReady(): Promise<void> {
    this.#loaded();
    await this._ready.wait();
  }

  /**
   * Resolves once the doc can be read and written: at once for one loaded from stored changes the client
   * held, which the host already has, otherwise once the host delivers it.
   */
  async whenUsable(): Promise<void> {
    this.#loaded();
    if (this.isLoaded()) {
      return;
    }
    await this._ready.wait();
  }

  isReady(): boolean {
    return this._ready.state === TriggerState.RESOLVED;
  }

  /**
   * The stored changes and the heads the host holds them at, for persisting the doc outside the host;
   * undefined while a change exists only here. A loaded doc is saved once per heads.
   * @internal
   */
  _heldState(): PassiveDocument | undefined {
    const body = this.#body;
    if (body?.kind === 'passive') {
      return { bytes: joinChunks(body), heads: body.heads };
    }
    if (body?.kind !== 'loaded' || body.hostHeads.length === 0 || !A.equals(A.getHeads(body.doc), body.hostHeads)) {
      return undefined;
    }
    if (!this.#saved || !A.equals(this.#saved.heads, body.hostHeads)) {
      this.#saved = { bytes: A.save(body.doc), heads: body.hostHeads };
    }
    return this.#saved;
  }

  /** Whether the document can be read and written now: ready, or loaded from bytes the client held. */
  isLoaded(): boolean {
    const body = this.#body;
    return this.isReady() || (body?.kind === 'loaded' && body.fromBytes);
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

  /**
   * Runs `fn` as one write scope. A passive handle that loads inside the scope loads at the heads it
   * shows, so every write of the scope applies to what the caller saw; its newer stored changes fold in
   * when the outermost scope closes, before this returns.
   */
  batch<R>(fn: () => R): R {
    this.#depth++;
    try {
      return fn();
    } finally {
      if (--this.#depth === 0) {
        this.#settle();
      }
    }
  }

  change(fn: (doc: A.Doc<T>) => void, opts?: A.ChangeOptions<any>): void {
    this.batch(() => {
      const body = this.#loaded();
      const before = body.doc;
      // A local change is a commit: post-commit callbacks run only once every listener has seen the event.
      runInCommit(() => {
        const headsBefore = A.getHeads(before);
        body.doc = opts ? A.change(before, opts, fn) : A.change(before, fn);
        this.emit('change', {
          handle: this,
          doc: body.doc,
          patches: A.diff(body.doc, headsBefore, A.getHeads(body.doc)),
          patchInfo: { before, after: body.doc, source: 'change' },
        });
      });
    });
  }

  changeAt(heads: A.Heads, fn: (doc: A.Doc<T>) => void, opts?: A.ChangeOptions<any>): A.Heads | undefined {
    const body = this.#loaded();
    const before = body.doc;
    return runInCommit(() => {
      const headsBefore = A.getHeads(before);
      const { newDoc, newHeads } = opts ? A.changeAt(before, heads, opts, fn) : A.changeAt(before, heads, fn);

      body.doc = newDoc;
      this.emit('change', {
        handle: this,
        doc: body.doc,
        patches: newHeads ? A.diff(body.doc, headsBefore, newHeads) : [],
        patchInfo: { before, after: body.doc, source: 'change' },
      });
      return newHeads ?? undefined;
    });
  }

  update(updateCallback: (doc: A.Doc<T>) => A.Doc<T>): void {
    const body = this.#loaded();
    const before = body.doc;
    runInCommit(() => {
      const headsBefore = A.getHeads(before);
      const newDoc = updateCallback(before);
      invariant(newDoc, 'DocHandleProxy.update returned undefined doc');
      body.doc = newDoc;
      this.emit('change', {
        handle: this,
        doc: body.doc,
        patches: A.diff(body.doc, headsBefore, A.getHeads(body.doc)),
        patchInfo: { before, after: body.doc, source: 'change' },
      });
    });
  }

  delete(): void {
    this._onDelete();
    this.emit('delete', { handle: this });
    this.#body = undefined;
  }

  /**
   * Loads a passive handle's stored changes; a no-op on any other.
   * @internal
   */
  _activate(): void {
    if (this.#body?.kind === 'passive') {
      this.#loaded();
    }
  }

  #loaded(): LoadedBody<T> {
    const body = this.#body;
    invariant(body, 'DocHandleProxy used after delete');
    return body.kind === 'loaded' ? body : this.#load(body);
  }

  /** The only step from passive to loaded. A load that throws leaves the handle passive with its changes. */
  #load(passive: PassiveBody): LoadedBody<T> {
    const started = performance.now();
    // Stored chunks, a snapshot and the incremental changes after it, which `load` does not take in any order.
    const stored = A.loadIncremental<T>(A.init<T>(), joinChunks(passive));
    const storedHeads = A.getHeads(stored);
    let body: LoadedBody<T>;
    if (this.#depth > 0 && A.hasHeads(stored, passive.heads) && !sameHeads(passive.heads, storedHeads)) {
      const after = A.saveSince(stored, passive.heads);
      const doc = A.clone(A.view(stored, passive.heads));
      A.free(stored);
      body = {
        kind: 'loaded',
        doc,
        hostHeads: A.getHeads(doc),
        fromBytes: true,
        catchUp: { after, heads: storedHeads },
      };
    } else {
      if (!A.hasHeads(stored, passive.heads)) {
        log.warn('stored changes are behind the heads shown', { documentId: this._documentId });
      }
      body = { kind: 'loaded', doc: stored, hostHeads: storedHeads, fromBytes: true };
    }
    this.#body = body;
    this._state = 'pending';
    if (this._ready.state !== TriggerState.WAITING) {
      this._ready.reset();
    }
    const ms = performance.now() - started;
    countWork('echo.activations');
    countWork('echo.activationMs', ms);
    markWork('echo.activation', ms.toFixed(1));
    this.emit('activated', { handle: this });
    return body;
  }

  /** Folds in the stored changes a write scope held back; the host holds them. */
  #settle(): void {
    const body = this.#body;
    if (body?.kind !== 'loaded' || !body.catchUp) {
      return;
    }
    const { after, heads } = body.catchUp;
    body.catchUp = undefined;
    const before = body.doc;
    const headsBefore = A.getHeads(before);
    body.doc = A.loadIncremental(before, after);
    this.#hostHolds(body, heads);
    try {
      this.emit('change', {
        handle: this,
        doc: body.doc,
        patches: A.diff(body.doc, headsBefore, A.getHeads(body.doc)),
        patchInfo: { before, after: body.doc, source: 'host' },
      });
    } catch (err) {
      log.catch(err);
    }
  }

  /** Unchecked: callers pass heads the document holds, and `A.hasHeads` looks up each head's change by hash on every update. */
  #hostHolds(body: LoadedBody<T>, heads: A.Heads): void {
    body.hostHeads = heads;
  }

  /**
   * What a subscription add tells the host: the heads the client holds that the host does too.
   * @internal
   */
  _subscription(): { heads?: A.Heads; passive?: true } {
    const body = this.#body;
    if (body?.kind === 'passive') {
      return body.awaiting ? { passive: true } : { heads: body.heads, passive: true };
    }
    return body !== undefined && body.hostHeads.length > 0 ? { heads: body.hostHeads } : {};
  }

  /**
   * Holds `passive` instead of a loaded document: replaces a passive handle's stored changes, or moves a
   * loaded handle the host has taken every change of back to stored changes, dropping its document.
   * @internal
   */
  _setPassive(passive: PassiveDirectory): void {
    invariant(
      this.#body?.kind === 'passive' || (this.#depth === 0 && this._isAcknowledged()),
      'A document with unsent changes cannot go passive.',
    );
    this.#body = {
      kind: 'passive',
      chunks: [passive.bytes],
      size: passive.bytes.length,
      heads: passive.heads,
      json: this.#directory ? passive.json : undefined,
    };
    this.#shown.wake();
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
    if (this.state !== 'pending') {
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
   * Fails {@link whenPassiveShown} for a passive handle still waiting on the host's first send, which the host
   * reports it cannot produce; a no-op for any other handle.
   * @internal
   */
  _failPassiveWait(documentId: string): void {
    const body = this.#body;
    if (body?.kind === 'passive' && body.awaiting && this.#shown.state === TriggerState.WAITING) {
      this.#shown.throw(new DocumentUnavailableError({ documentId }));
    }
  }

  /**
   * Get pending changes since last write.
   * @internal
   */
  _getPendingChanges(): Uint8Array | undefined {
    const body = this.#body;
    invariant(body?.kind === 'loaded', 'Doc is deleted, cannot get last write mutation');
    if (A.equals(A.getHeads(body.doc), body.hostHeads)) {
      return;
    }

    const mutation = A.saveSince(body.doc, body.hostHeads);
    if (mutation.length === 0) {
      return;
    }
    body.sending = A.getHeads(body.doc);
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
    const body = this.#body;
    return body?.kind === 'loaded' && A.equals(A.getHeads(body.doc), body.hostHeads);
  }

  /**
   * Confirm that the last write was successful.
   * @internal
   */
  _confirmSync(): void {
    const body = this.#body;
    if (body?.kind === 'loaded' && body.sending) {
      this.#hostHolds(body, body.sending);
      body.sending = undefined;
    }
  }

  /**
   * @internal
   */
  _integratePassiveUpdate(
    mutation: Uint8Array | undefined,
    passive: { heads: A.Heads; json?: string; updatedAt?: number } | undefined,
  ): void {
    const held = this.#body;
    invariant(held?.kind === 'passive', 'Not a passive handle.');
    if (mutation?.length) {
      held.chunks.push(mutation);
      held.size += mutation.length;
    }
    const json =
      held.size <= (this.#directory ? BACKED_DIRECTORY_LIMIT : BACKED_OBJECT_LIMIT) ? passive?.json : undefined;
    if (passive && json !== undefined) {
      held.heads = passive.heads;
      if (this.#directory) {
        held.json = json;
      }
    }
    if (held.awaiting) {
      // Consumed by whoever waits on the first send, which reads the body rather than this event.
      held.awaiting = false;
      this.#shown.wake();
      return;
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
    const body = this.#body;
    invariant(body?.kind === 'loaded', 'Doc is deleted, cannot write mutation');
    const before = body.doc;
    const headsBefore = A.getHeads(before);
    body.doc = A.loadIncremental(before, mutation);

    if (A.equals(headsBefore, body.hostHeads)) {
      this.#hostHolds(body, A.getHeads(body.doc));
    }

    this._wakeReady();

    // The host echoes a client's own mutation back over its subscription as a separate change; it
    // merges cleanly and moves the heads but alters nothing, so emitting for it would report a
    // change that did not happen — a listener waiting for the *next* remote edit would be woken by
    // its own. Patches, not heads, are the test: a merge can advance the heads without touching any
    // value.
    const patches = A.diff(body.doc, headsBefore, A.getHeads(body.doc));
    if (patches.length === 0) {
      return;
    }

    this.emit('change', {
      handle: this,
      doc: body.doc,
      patches,
      patchInfo: { before, after: body.doc, source: bulk ? 'bulk' : 'host' },
    });
  }
}

const joinChunks = (passive: PassiveBody): Uint8Array => {
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
