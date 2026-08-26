//
// Copyright 2026 DXOS.org
//

import { type DocHandle, type DocumentId, type DocumentProgress } from '@automerge/automerge-repo';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type HandleQueryState } from './handle-state';

/**
 * A borrowed reference to one loaded document, held for as long as the holder needs it.
 *
 * The repo caches a document forever once anything faults it in, so residency has to be decided by
 * the host rather than by the repo: a lease records that decision. Holding one is the only way to
 * reach a `DocHandle` — nothing outside {@link DocumentLeaseRegistry} may take the repo route,
 * because a handle obtained behind the registry's back would be evicted while still in use.
 *
 * Disposal is idempotent and, being `Symbol.dispose`, is usually written as `using lease = ...`.
 * A holder that outlives its scope (a subscription, a space root) keeps the lease in a field and
 * disposes it in its own teardown.
 */
export class DocumentLease<T = any> implements Disposable {
  #release: (() => void) | undefined;

  /**
   * Resolved on access rather than at construction, because an eviction of the same document may
   * still be draining: the query and handle a lease taken during that window must be the ones the
   * repo holds after it, not the pair being torn down.
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

  /** The always-attached handle. Its own state predicates lie — read {@link state} instead. */
  get handle(): DocHandle<T> {
    this.#assertLive();
    return this._open().handle;
  }

  /** The live query, for observing readiness and sync transitions. */
  get query(): DocumentProgress<T> {
    this.#assertLive();
    return this._open().query;
  }

  get state(): HandleQueryState {
    this.#assertLive();
    return this._open().query.peek().state;
  }

  get disposed(): boolean {
    return this.#release === undefined;
  }

  [Symbol.dispose](): void {
    const release = this.#release;
    this.#release = undefined;
    release?.();
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
};

/**
 * Reference counts the documents the host holds loaded, and evicts each one when its last lease is
 * disposed.
 *
 * Eviction is deferred rather than immediate: it has to drain the document's pending save, which is
 * asynchronous, while disposal is not. Deferring also absorbs the common acquire-release-acquire of
 * a query pass that reads the same document twice in consecutive turns.
 */
export class DocumentLeaseRegistry {
  readonly #counts = new Map<DocumentId, number>();
  readonly #pendingEviction = new Set<DocumentId>();
  readonly #params: DocumentLeaseRegistryParams;

  #draining: Promise<void> | undefined = undefined;
  #closed = false;

  constructor(params: DocumentLeaseRegistryParams) {
    this.#params = params;
  }

  /** Documents currently leased — the host's document residency. */
  get size(): number {
    return this.#counts.size;
  }

  get leasedDocumentIds(): DocumentId[] {
    return [...this.#counts.keys()];
  }

  isLeased(documentId: DocumentId): boolean {
    return this.#counts.has(documentId);
  }

  acquire<T>(documentId: DocumentId): DocumentLease<T> {
    invariant(!this.#closed, 'Document lease registry is closed.');
    this.#pendingEviction.delete(documentId);
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
    this.#pendingEviction.clear();
  }

  /** Runs the pending evictions, for a caller that needs residency settled before it measures it. */
  async drain(): Promise<void> {
    await this.#draining;
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
    this.#pendingEviction.add(documentId);
    this.#scheduleDrain();
  }

  #scheduleDrain(): void {
    if (this.#draining !== undefined) {
      return;
    }
    this.#draining = Promise.resolve().then(async () => {
      try {
        // Drained in a loop: an eviction awaits a flush, and a lease released during that await
        // would otherwise wait for the next release to schedule a drain of its own.
        while (this.#pendingEviction.size > 0 && !this.#closed) {
          const documentIds = [...this.#pendingEviction];
          this.#pendingEviction.clear();
          for (const documentId of documentIds) {
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
      } finally {
        this.#draining = undefined;
      }
    });
  }
}
