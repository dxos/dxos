//
// Copyright 2024 DXOS.org
//

import { UpdateScheduler } from '@dxos/async';
import { next as A, type Heads } from '@dxos/automerge/automerge';
import { type Repo, type DocHandle, type DocumentId } from '@dxos/automerge/automerge-repo';
import { Resource } from '@dxos/context';
import { type SpaceDoc } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type BatchedDocumentUpdates, type DocumentUpdate } from '@dxos/protocols/proto/dxos/echo/service';

const MAX_UPDATE_FREQ = 10; // [updates/sec]

export type DocumentsSynchronizerParams = {
  repo: Repo;
  sendUpdates: (updates: BatchedDocumentUpdates) => void;
};

interface DocSyncState {
  handle: DocHandle<SpaceDoc>;
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

  addDocuments(documentIds: DocumentId[], retryCounter = 0) {
    if (retryCounter > 3) {
      log.warn('Failed to load document, retry limit reached', { documentIds });
      return;
    }

    for (const documentId of documentIds) {
      const doc = this._params.repo.find(documentId as DocumentId);
      doc
        .whenReady()
        .then(() => {
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

  removeDocuments(documentIds: DocumentId[]) {
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

  update(updates: DocumentUpdate[]) {
    for (const { documentId, mutation, isNew } of updates) {
      if (isNew) {
        const doc = this._params.repo.find(documentId as DocumentId);
        doc.update((doc) => A.loadIncremental(doc, mutation));
        this._startSync(doc);
      } else {
        this._writeMutation(documentId as DocumentId, mutation);
      }
    }
  }

  private _startSync(doc: DocHandle<SpaceDoc>) {
    if (this._syncStates.has(doc.documentId)) {
      log.info('Document already being synced', { documentId: doc.documentId });
      return;
    }

    const syncState: DocSyncState = { handle: doc };
    this._subscribeForChanges(syncState);
    this._syncStates.set(doc.documentId, syncState);
  }

  _subscribeForChanges(syncState: DocSyncState) {
    const handler = () => {
      this._pendingUpdates.add(syncState.handle.documentId);
      this._sendUpdatesJob!.trigger();
    };
    syncState.handle.on('heads-changed', handler);
    syncState.clearSubscriptions = () => syncState.handle.off('heads-changed', handler);
  }

  private async _checkAndSendUpdates() {
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
    const doc = syncState.handle.docSync();
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

  private _writeMutation(documentId: DocumentId, mutation: Uint8Array) {
    const syncState = this._syncStates.get(documentId);
    invariant(syncState, 'Sync state for document not found');
    syncState.handle.update((doc) => {
      const headsBefore = A.getHeads(doc);
      const newDoc = A.loadIncremental(doc, mutation);
      if (A.equals(headsBefore, syncState.lastSentHead)) {
        syncState.lastSentHead = A.getHeads(newDoc);
      }
      return newDoc;
    });
  }
}
