//
// Copyright 2024 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import { type DocHandle, type DocumentId, type Repo } from '@automerge/automerge-repo';

import { UpdateScheduler } from '@dxos/async';
import { LifecycleState, Resource } from '@dxos/context';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type BatchedDocumentUpdates, type DocumentUpdate } from '@dxos/protocols/proto/dxos/echo/service';

const MAX_UPDATE_FREQ = 10; // [updates/sec]

export type DocumentsSynchronizerParams = {
  repo: Repo;
  sendUpdates: (updates: BatchedDocumentUpdates) => void;
};

interface DocSyncState {
  handle: DocHandle<DatabaseDirectory>;
  lastSentHead?: Heads;
  clearSubscriptions?: () => void;
}

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
   * Job that schedules if there are pending updates.
   */
  private _sendUpdatesJob?: UpdateScheduler = undefined;

  constructor(private readonly _params: DocumentsSynchronizerParams) {
    super();
  }

  addDocuments(documentIds: DocumentId[], retryCounter = 0): void {
    if (retryCounter > 3) {
      log.warn('Failed to load document, retry limit reached', { documentIds });
      return;
    }

    for (const documentId of documentIds) {
      this._params.repo
        .find<DatabaseDirectory>(documentId as DocumentId)
        .then(async (doc) => {
          await doc.whenReady();
          this._startSync(doc);
          this._pendingUpdates.add(doc.documentId);
          this._sendUpdatesJob!.trigger();
        })
        .catch((error) => {
          log.warn('Failed to load document, wraparound', { documentId, error });
          this.addDocuments([documentId], retryCounter + 1);
        });
    }
  }

  removeDocuments(documentIds: DocumentId[]): void {
    for (const documentId of documentIds) {
      this._syncStates.get(documentId)?.clearSubscriptions?.();
      this._syncStates.delete(documentId);
      this._pendingUpdates.delete(documentId);
    }
  }

  protected override async _open(): Promise<void> {
    this._sendUpdatesJob = new UpdateScheduler(this._ctx, this._checkAndSendUpdates.bind(this), {
      maxFrequency: MAX_UPDATE_FREQ,
    });
  }

  protected override async _close(): Promise<void> {
    await this._sendUpdatesJob!.join();
    this._syncStates.clear();
  }

  async update(updates: DocumentUpdate[]): Promise<void> {
    for (const { documentId, mutation, isNew } of updates) {
      this._writeMutation(documentId as DocumentId, mutation, isNew);
    }
    // TODO(mykola): This should not be required.
    await this._params.repo.flush(updates.map(({ documentId }) => documentId as DocumentId));
  }

  private _startSync(doc: DocHandle<DatabaseDirectory>) {
    if (this._syncStates.has(doc.documentId)) {
      log('Document already being synced', { documentId: doc.documentId });
      return;
    }

    const syncState: DocSyncState = { handle: doc };
    this._subscribeForChanges(syncState);
    this._syncStates.set(doc.documentId, syncState);
    return syncState;
  }

  _subscribeForChanges(syncState: DocSyncState): void {
    const handler = () => {
      this._pendingUpdates.add(syncState.handle.documentId);
      this._sendUpdatesJob!.trigger();
    };
    syncState.handle.on('heads-changed', handler);
    syncState.clearSubscriptions = () => syncState.handle.off('heads-changed', handler);
  }

  private async _checkAndSendUpdates(): Promise<void> {
    const updates: DocumentUpdate[] = [];

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

    if (updates.length > 0) {
      this._params.sendUpdates({ updates });
    }
  }

  private _getPendingChanges(documentId: DocumentId): Uint8Array | void {
    const syncState = this._syncStates.get(documentId);
    invariant(syncState, 'Sync state for document not found');
    const handle = syncState.handle;
    if (!handle || !handle.isReady() || !handle.doc()) {
      return;
    }
    const doc = handle.doc();
    const mutation = syncState.lastSentHead ? A.saveSince(doc, syncState.lastSentHead) : A.save(doc);
    if (mutation.length === 0) {
      return;
    }
    syncState.lastSentHead = A.getHeads(doc);
    return mutation;
  }

  private _writeMutation(documentId: DocumentId, mutation: Uint8Array, isNew?: boolean): void {
    if (this._lifecycleState === LifecycleState.CLOSED) {
      return;
    }
    if (isNew) {
      const newHandle = this._params.repo.import<DatabaseDirectory>(mutation, { docId: documentId });
      const syncState = this._startSync(newHandle);
      syncState!.lastSentHead = A.getHeads(newHandle.doc());
    } else {
      const syncState = this._syncStates.get(documentId);
      invariant(syncState, 'Sync state for document not found');
      const headsBefore = A.getHeads(syncState.handle.doc());
      // This will update corresponding handle in the repo.
      this._params.repo.import(mutation, { docId: documentId });

      if (A.equals(headsBefore, syncState!.lastSentHead)) {
        // No new mutations were discovered on network, so we do not need to send updates from worker to client.
        syncState!.lastSentHead = A.getHeads(syncState.handle.doc());
      }
    }
  }
}
