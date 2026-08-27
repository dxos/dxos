//
// Copyright 2024 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';

import { UpdateScheduler } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type DataService } from '@dxos/protocols/rpc';
import { retry } from '@dxos/util';

import { type AutomergeHost, type DocumentLease } from '../automerge';

const MAX_UPDATE_FREQ = 10; // [updates/sec]

export type DocumentsSynchronizerProps = {
  automergeHost: AutomergeHost;
  sendUpdates: (updates: DataService.BatchedDocumentUpdates) => void;
};

interface DocSyncState {
  /** Held for as long as the client subscribes to the document; disposal lets the host evict it. */
  lease: DocumentLease<DatabaseDirectory>;
  lastSentHead?: Heads;
  clearSubscriptions?: () => void;
}

const WRAP_AROUND_RETRY_LIMIT = 3;
const WRAP_AROUND_RETRY_INITIAL_DELAY = 100; // [ms]

/**
 * Manages a connection and replication between worker's Automerge Repo and the client's Repo.
 */
export class DocumentsSynchronizer extends Resource {
  private readonly _syncStates = new Map<DocumentId, DocSyncState>();
  /**
   * Documents that have pending updates.
   * Used to batch updates.
   */
  private readonly _pendingUpdates = new Set<DocumentId>();

  /**
   * Documents whose on-disk probe completed negative and that need a
   * mutation-less `requesting: true` transition update sent to the client.
   * Cleared per-flush in `_checkAndSendUpdates`.
   */
  private readonly _pendingRequesting = new Set<DocumentId>();

  /**
   * Job that schedules if there are pending updates.
   */
  private _sendUpdatesJob?: UpdateScheduler = undefined;

  /**
   * Test affordance: when true, `_checkAndSendUpdates` is a no-op so no
   * document state is flushed to the client. `addDocuments` still loads
   * documents on the worker side and accumulates `_pendingUpdates`, which
   * flush automatically on resume. From the client's perspective every
   * `RepoProxy.find()` made while paused returns a handle that stays
   * `pending` until resume — used to deterministically reproduce
   * worker-side hangs in query-pipeline tests.
   */
  #sendUpdatesPaused = false;

  constructor(private readonly _params: DocumentsSynchronizerProps) {
    super();
  }

  /**
   * Test affordance: pause/resume flushing of document updates to the client.
   * See `#sendUpdatesPaused` for details. Idempotent.
   */
  setSendUpdatesPaused(paused: boolean): void {
    if (this.#sendUpdatesPaused === paused) {
      return;
    }
    this.#sendUpdatesPaused = paused;
    if (!paused) {
      this._sendUpdatesJob?.trigger();
    }
  }

  async addDocuments(documentIds: DocumentId[]): Promise<void> {
    await Promise.all(
      documentIds.map(async (documentId) => {
        try {
          await retry(
            { count: WRAP_AROUND_RETRY_LIMIT, delayMs: WRAP_AROUND_RETRY_INITIAL_DELAY, exponent: 2 },
            async () => {
              try {
                log('loading document', { documentId });
                const lease = this._params.automergeHost.acquireDoc<DatabaseDirectory>(documentId as DocumentId);
                if (this._lifecycleState === LifecycleState.CLOSED) {
                  // `_close` has already cleared `_syncStates`, so nothing would ever release this.
                  lease[Symbol.dispose]();
                  return;
                }
                this._startSync(lease);
                this._pendingUpdates.add(lease.documentId);
                this._sendUpdatesJob!.trigger();
                // Background disk probe so the client can distinguish
                // "not on disk, waiting for network" from "still loading".
                // Fire-and-forget; the result feeds `_pendingRequesting`.
                this._scheduleDiskProbe(lease.documentId);
              } catch (err) {
                log.warn('failed to load document', { err });
                throw err;
              }
            },
          );
        } catch (err) {
          log.catch(err);
        }
      }),
    );
  }

  /**
   * Probe local storage for the document; if not present, enqueue a
   * `requesting: true` transition update so the client moves the handle
   * from `'pending'` to `'requesting'` and disk-only callers can give up
   * without waiting on the network. If the doc became `ready` before the
   * probe completes (e.g. delivered concurrently by network/peer), no
   * transition update is sent.
   */
  private _scheduleDiskProbe(documentId: DocumentId): void {
    void Promise.resolve().then(async () => {
      try {
        const onDisk = await this._params.automergeHost.hasDocOnDisk(documentId);
        if (onDisk) {
          // Doc is on disk; the existing `heads-changed` flow will deliver
          // a normal mutation update once the load completes.
          return;
        }
        // Skip the transition signal if the doc has since become `ready`
        // via the network/peer race.
        const syncState = this._syncStates.get(documentId);
        if (!syncState || syncState.lease.state === 'ready') {
          return;
        }
        this._pendingRequesting.add(documentId);
        this._sendUpdatesJob?.trigger();
      } catch (err) {
        log.warn('disk probe failed', { documentId, err });
      }
    });
  }

  /**
   * Drops the documents the client no longer subscribes to, releasing each lease — which is what
   * lets the host evict a document nothing else is reading.
   */
  removeDocuments(documentIds: DocumentId[]): void {
    for (const documentId of documentIds) {
      const syncState = this._syncStates.get(documentId);
      syncState?.clearSubscriptions?.();
      syncState?.lease[Symbol.dispose]();
      this._syncStates.delete(documentId);
      this._pendingUpdates.delete(documentId);
      this._pendingRequesting.delete(documentId);
    }
  }

  protected override async _open(): Promise<void> {
    this._sendUpdatesJob = new UpdateScheduler(this._ctx, this._checkAndSendUpdates.bind(this), {
      maxFrequency: MAX_UPDATE_FREQ,
    });
  }

  protected override async _close(): Promise<void> {
    await this._sendUpdatesJob!.join();
    for (const syncState of this._syncStates.values()) {
      syncState.clearSubscriptions?.();
      syncState.lease[Symbol.dispose]();
    }
    this._syncStates.clear();
  }

  async update(ctx: Context, updates: DataService.DocumentUpdate[]): Promise<void> {
    for (const { documentId, mutation } of updates) {
      // Inbound (client -> worker) updates are always mutation-bearing; the
      // `mutation`-less variant is only used for worker -> client transition
      // signals (e.g. `requesting`). Defensive skip here to satisfy the
      // optional proto field.
      if (!mutation) {
        continue;
      }
      await this._writeMutation(documentId as DocumentId, mutation);
    }
    // TODO(mykola): This should not be required.
    await this._params.automergeHost.flush(ctx, {
      documentIds: updates.map(({ documentId }) => documentId as DocumentId),
    });
  }

  private _startSync(lease: DocumentLease<DatabaseDirectory>) {
    if (this._syncStates.has(lease.documentId)) {
      log('Document already being synced', { documentId: lease.documentId });
      // One lease per subscribed document: the sync state already holds one.
      lease[Symbol.dispose]();
      return;
    }

    const syncState: DocSyncState = { lease };
    this._subscribeForChanges(syncState);
    this._syncStates.set(lease.documentId, syncState);
    return syncState;
  }

  _subscribeForChanges(syncState: DocSyncState): void {
    const handler = () => {
      this._pendingUpdates.add(syncState.lease.documentId);
      this._sendUpdatesJob!.trigger();
    };
    syncState.lease.on('heads-changed', handler);
    syncState.clearSubscriptions = () => syncState.lease.off('heads-changed', handler);
  }

  private async _checkAndSendUpdates(): Promise<void> {
    if (this.#sendUpdatesPaused) {
      return;
    }
    const updates: DataService.DocumentUpdate[] = [];

    const docsWithPendingUpdates = Array.from(this._pendingUpdates);
    this._pendingUpdates.clear();

    for (const documentId of docsWithPendingUpdates) {
      const update = this._getPendingChanges(documentId);
      if (update) {
        updates.push({
          documentId,
          mutation: update,
        });
      }
    }

    // Mutation-less transition updates: tell the client `requesting: true`
    // for any documents whose disk probe completed negative. Skip docs that
    // are already being delivered as a real mutation in this same batch
    // (those go directly to `ready` on the client and a subsequent
    // `requesting` would be ignored anyway).
    const docsRequesting = Array.from(this._pendingRequesting);
    this._pendingRequesting.clear();
    if (docsRequesting.length > 0) {
      const docsBeingFlushed = new Set(updates.map((update) => update.documentId));
      for (const documentId of docsRequesting) {
        if (docsBeingFlushed.has(documentId)) {
          continue;
        }
        updates.push({ documentId, requesting: true });
      }
    }

    if (updates.length > 0) {
      this._params.sendUpdates({ updates });
    }
  }

  private _getPendingChanges(documentId: DocumentId): Uint8Array | void {
    const syncState = this._syncStates.get(documentId);
    invariant(syncState, 'Sync state for document not found');
    if (syncState.lease.state !== 'ready') {
      return;
    }
    const doc = syncState.lease.doc();
    if (!doc) {
      return;
    }
    const mutation = syncState.lastSentHead ? A.saveSince(doc, syncState.lastSentHead) : A.save(doc);
    if (mutation.length === 0) {
      return;
    }
    syncState.lastSentHead = A.getHeads(doc);
    return mutation;
  }

  private async _writeMutation(documentId: DocumentId, mutation: Uint8Array): Promise<void> {
    if (this._lifecycleState === LifecycleState.CLOSED) {
      return;
    }
    log('write mutation', { documentId });

    const syncState = this._syncStates.get(documentId);
    invariant(syncState, 'Sync state for document not found');
    const headsBefore = A.getHeads(syncState.lease.doc());
    // This will update corresponding handle in the repo. The import's own lease is surplus —
    // `syncState.lease` is what keeps the document resident while the client subscribes.
    using _imported = await this._params.automergeHost.createDoc(mutation, { documentId, preserveHistory: true });

    if (A.equals(headsBefore, syncState.lastSentHead)) {
      // No new mutations were discovered on network, so we do not need to send updates from worker to client.
      syncState.lastSentHead = A.getHeads(syncState.lease.doc());
    }
  }
}
