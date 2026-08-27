//
// Copyright 2026 DXOS.org
//

import type * as A from '@automerge/automerge';
import {
  type AutomergeUrl,
  type DocHandle,
  type DocHandleChangePayload,
  type DocumentId,
  type DocumentProgress,
  type Heads,
  type QueryState,
  type UrlHeads,
} from '@automerge/automerge-repo';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type HandleQueryState } from './handle-state';

/**
 * Events a holder can observe on the leased document.
 */
export type DocumentLeaseEvents<T> = {
  'change': DocHandleChangePayload<T>;
  'heads-changed': { doc: A.Doc<T>; heads: Heads };
};

/**
 * A borrowed reference to one loaded document, held for as long as the holder needs it.
 *
 * The repo caches a document forever once anything faults it in, so residency has to be decided by
 * the host rather than by the repo: a lease records that decision. The underlying `DocHandle` is
 * never handed out — a holder that captured one would keep reading (and writing) a document the host
 * has since evicted, and no reference count could see it — so every operation goes through the lease
 * and stops working the moment it is disposed.
 *
 * Disposal is idempotent and, being `Symbol.dispose`, is usually written as `using lease = ...`.
 * A holder that outlives its scope (a subscription, a space root) keeps the lease in a field and
 * disposes it in its own teardown.
 */
export class DocumentLease<T = any> implements Disposable {
  #release: (() => void) | undefined;

  /**
   * The handle and query are resolved per access rather than captured, because an eviction of the
   * same document may still be draining: a lease taken during that window must operate on the pair
   * the repo holds after it, not the pair being torn down.
   */
  constructor(
    private readonly _documentId: DocumentId,
    private readonly _open: () => { query: DocumentProgress<T>; handle: DocHandle<T> },
    release: () => void,
  ) {
    this.#release = release;
  }

  /** Readable after disposal: an id is not a claim on the document. */
  get documentId(): DocumentId {
    return this._documentId;
  }

  /** Derived from the id, so it reads the same whether or not the document is loaded. */
  get url(): AutomergeUrl {
    return `automerge:${this._documentId}` as AutomergeUrl;
  }

  /** Readiness of the document — the `DocHandle`'s own predicates lie, see `getHandleState`. */
  get state(): HandleQueryState {
    return this.#query.peek().state;
  }

  get disposed(): boolean {
    return this.#release === undefined;
  }

  /**
   * The document, or the empty initial document while it is still loading — check {@link state}
   * (or await {@link waitUntilReady}) when the difference matters.
   */
  doc(): A.Doc<T> {
    return this.#handle.doc();
  }

  heads(): UrlHeads {
    return this.#handle.heads();
  }

  change(callback: A.ChangeFn<T>, options?: A.ChangeOptions<T>): void {
    this.#handle.change(callback, options);
  }

  changeAt(heads: UrlHeads, callback: A.ChangeFn<T>, options?: A.ChangeOptions<T>): UrlHeads | undefined {
    return this.#handle.changeAt(heads, callback, options);
  }

  /** Resolves once the document is loaded, rejects if the query fails. */
  async waitUntilReady(): Promise<void> {
    await this.#query.whenReady();
  }

  on<K extends keyof DocumentLeaseEvents<T>>(event: K, listener: (payload: DocumentLeaseEvents<T>[K]) => void): void {
    this.#handle.on(event as any, listener as any);
  }

  off<K extends keyof DocumentLeaseEvents<T>>(event: K, listener: (payload: DocumentLeaseEvents<T>[K]) => void): void {
    this.#handle.off(event as any, listener as any);
  }

  once<K extends keyof DocumentLeaseEvents<T>>(event: K, listener: (payload: DocumentLeaseEvents<T>[K]) => void): void {
    this.#handle.once(event as any, listener as any);
  }

  /** Observes readiness and sync transitions. Returns an unsubscribe function. */
  subscribe(callback: (state: QueryState<T>) => void): () => void {
    return this.#query.subscribe(callback);
  }

  [Symbol.dispose](): void {
    const release = this.#release;
    this.#release = undefined;
    release?.();
  }

  get #handle(): DocHandle<T> {
    this.#assertLive();
    return this._open().handle;
  }

  get #query(): DocumentProgress<T> {
    this.#assertLive();
    return this._open().query;
  }

  #assertLive(): void {
    invariant(this.#release !== undefined, 'Document lease has been disposed.');
  }
}

export type DocumentLeaseRegistryParams = {
  /**
   * Opens (or returns the cached) query and its attached handle for a document — the one place the
   * repo is consulted.
   */
  open: (documentId: DocumentId) => { query: DocumentProgress<any>; handle: DocHandle<any> };

  /**
   * Drops the document from the repo cache once nothing holds it. Runs after the last lease is
   * disposed. Eviction is asynchronous, so a lease can be taken while it runs: `isCancelled` must be
   * consulted after every await, and the document left alone once it reads true.
   */
  evict: (documentId: DocumentId, isCancelled: () => boolean) => Promise<void>;

  /**
   * How long a document stays resident after its last lease is disposed. Faulting a document back in
   * costs a fresh automerge document whose WASM memory is never returned, so a document released
   * between two passes of the same workload has to survive the gap rather than be evicted into it.
   */
  evictionDelay?: number;

  /**
   * How many released documents stay resident regardless of age — the most recently released ones.
   * A floor keeps the hot working set loaded on a host whose whole workload is shorter than the
   * delay, and bounds nothing else: leased documents are never counted against it.
   */
  minResidentDocuments?: number;
};

const DEFAULT_EVICTION_DELAY = 0;
const DEFAULT_MIN_RESIDENT_DOCUMENTS = 0;

/**
 * Reference counts the documents the host holds loaded, and evicts each one once its last lease has
 * been disposed for {@link DocumentLeaseRegistryParams.evictionDelay}, oldest release first, keeping
 * the {@link DocumentLeaseRegistryParams.minResidentDocuments} most recently released.
 *
 * Eviction is never immediate: it has to drain the document's pending save, which is asynchronous
 * while disposal is not, and evicting on the last dispose would thrash a workload that releases and
 * re-reads the same document across passes.
 */
export class DocumentLeaseRegistry {
  readonly #counts = new Map<DocumentId, number>();

  /** Released documents by release time, in release order — the eviction queue. */
  readonly #idle = new Map<DocumentId, number>();

  readonly #params: DocumentLeaseRegistryParams;
  readonly #evictionDelay: number;
  readonly #minResidentDocuments: number;

  #timer: ReturnType<typeof setTimeout> | undefined = undefined;
  #draining: Promise<void> | undefined = undefined;
  #closed = false;

  constructor(params: DocumentLeaseRegistryParams) {
    this.#params = params;
    this.#evictionDelay = params.evictionDelay ?? DEFAULT_EVICTION_DELAY;
    this.#minResidentDocuments = params.minResidentDocuments ?? DEFAULT_MIN_RESIDENT_DOCUMENTS;
  }

  /** Documents currently leased — the host's document residency. */
  get size(): number {
    return this.#counts.size;
  }

  get leasedDocumentIds(): DocumentId[] {
    return [...this.#counts.keys()];
  }

  /** Released documents still resident, waiting out the delay or held by the floor. */
  get idleCount(): number {
    return this.#idle.size;
  }

  isLeased(documentId: DocumentId): boolean {
    return this.#counts.has(documentId);
  }

  acquire<T>(documentId: DocumentId): DocumentLease<T> {
    invariant(!this.#closed, 'Document lease registry is closed.');
    this.#idle.delete(documentId);
    this.#counts.set(documentId, (this.#counts.get(documentId) ?? 0) + 1);
    // Faulted in now so the document starts loading, and again on each access — see the lease's
    // constructor for why the pair cannot be captured here.
    this.#params.open(documentId);
    return new DocumentLease<T>(
      documentId,
      () => this.#params.open(documentId),
      () => this.#release(documentId),
    );
  }

  /**
   * Stops evicting and forgets every count, without disposing the outstanding leases: the repo is
   * being shut down, so unloading one document at a time would be wasted work.
   */
  close(): void {
    this.#closed = true;
    this.#counts.clear();
    this.#idle.clear();
    this.#clearTimer();
  }

  /**
   * Evicts every released document now, ignoring the delay and the floor — for a caller that needs
   * residency settled before it measures it.
   */
  async drain(): Promise<void> {
    this.#clearTimer();
    await this.#draining;
    await this.#run(true);
  }

  #release(documentId: DocumentId): void {
    const count = this.#counts.get(documentId);
    if (count === undefined) {
      // The registry was closed under the holder, which is not the holder's fault to report.
      return;
    }
    if (count > 1) {
      this.#counts.set(documentId, count - 1);
      return;
    }

    this.#counts.delete(documentId);
    this.#idle.set(documentId, Date.now());
    this.#scheduleDrain();
  }

  /** Documents due for eviction now, oldest release first. */
  #evictable(force: boolean): DocumentId[] {
    const excess = force ? this.#idle.size : this.#idle.size - this.#minResidentDocuments;
    if (excess <= 0) {
      return [];
    }

    const now = Date.now();
    const evictable: DocumentId[] = [];
    for (const [documentId, releasedAt] of this.#idle) {
      if (evictable.length >= excess) {
        break;
      }
      if (!force && now - releasedAt < this.#evictionDelay) {
        // Release order, so nothing after this one has waited longer.
        break;
      }
      evictable.push(documentId);
    }
    return evictable;
  }

  #scheduleDrain(): void {
    if (this.#timer !== undefined || this.#closed) {
      return;
    }

    const excess = this.#idle.size - this.#minResidentDocuments;
    if (excess <= 0) {
      return;
    }
    const oldest = this.#idle.values().next();
    const wait = oldest.done ? 0 : Math.max(0, this.#evictionDelay - (Date.now() - oldest.value));
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      void this.#run(false);
    }, wait);
  }

  #clearTimer(): void {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }
  }

  /** Serializes drains: a forced drain must not interleave with a scheduled one. */
  #run(force: boolean): Promise<void> {
    const running = (this.#draining ?? Promise.resolve()).then(() => this.#drain(force));
    this.#draining = running;
    const settled = running.finally(() => {
      if (this.#draining === settled) {
        this.#draining = undefined;
      }
    });
    this.#draining = settled;
    return settled;
  }

  async #drain(force: boolean): Promise<void> {
    // Drained in a loop: an eviction awaits a flush, and a document released during that await would
    // otherwise wait for the next release to schedule a drain of its own.
    while (!this.#closed) {
      const documentIds = this.#evictable(force);
      if (documentIds.length === 0) {
        break;
      }
      for (const documentId of documentIds) {
        this.#idle.delete(documentId);
        if (this.#counts.has(documentId)) {
          continue;
        }
        try {
          await this.#params.evict(documentId, () => this.#closed || this.#counts.has(documentId));
        } catch (err) {
          log.warn('failed to evict document', { documentId, err });
        }
        if (this.#counts.has(documentId) && !this.#closed) {
          // Re-leased while the eviction was draining, so the document is faulted back in here
          // rather than on the holder's next access, which may be its first.
          this.#params.open(documentId);
        }
      }
    }

    if (!force) {
      // Whatever the delay or the floor still holds needs a timer of its own.
      this.#scheduleDrain();
    }
  }
}
