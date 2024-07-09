//
// Copyright 2024 DXOS.org
//

import { UpdateScheduler } from '@dxos/async';
import { next as A } from '@dxos/automerge/automerge';
import { type Repo, type DocHandle, type DocumentId } from '@dxos/automerge/automerge-repo';
import { type Context, Resource } from '@dxos/context';
import { type SpaceDoc } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type BatchedDocumentUpdates, type DocumentUpdate } from '@dxos/protocols/proto/dxos/echo/service';

import { DocSyncState } from './doc-sync-state';

const MAX_UPDATE_FREQ = 10; // [updates/sec]

export type DocumentsSynchronizerParams = {
  repo: Repo;
  sendUpdates: (updates: BatchedDocumentUpdates) => void;
};

export class DocumentsSynchronizer extends Resource {
  private readonly _syncStates = new Map<DocumentId, { syncState: DocSyncState<SpaceDoc>; ctx: Context }>();
  /**
   * Documents that have pending updates.
   * Used to batch updates.
   */
  private readonly _docsWithPendingUpdates = new Set<DocumentId>();

  /**
   * Job that schedules if there are pending updates.
   */
  private _sendUpdatesJob?: UpdateScheduler = undefined;

  constructor(private readonly _params: DocumentsSynchronizerParams) {
    super();
  }

  async addDocuments(documentIds: DocumentId[]) {
    for (const documentId of documentIds) {
      const doc = this._params.repo.find(documentId as DocumentId);
      await doc.whenReady();
      this._startSync(doc);
      this._docsWithPendingUpdates.add(doc.documentId);
    }
    this._sendUpdatesJob!.trigger();
  }

  removeDocuments(documentIds: DocumentId[]) {
    for (const documentId of documentIds) {
      void this._syncStates.get(documentId)?.ctx.dispose();
      this._syncStates.delete(documentId);
      this._docsWithPendingUpdates.delete(documentId);
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

  write(updates: DocumentUpdate[]) {
    for (const { documentId, mutation, isNew } of updates) {
      if (isNew) {
        const doc = this._params.repo.find(documentId as DocumentId);
        doc.update((doc) => A.loadIncremental(doc, mutation));
        this._startSync(doc);
      } else {
        const syncState = this._syncStates.get(documentId as DocumentId)?.syncState;
        invariant(syncState, 'Sync state for document not found');
        syncState.write(mutation);
      }
    }
  }

  private _startSync(doc: DocHandle<SpaceDoc>) {
    invariant(!this._syncStates.has(doc.documentId), 'Document already being synced');
    const syncState = new DocSyncState(doc);
    const ctx = this._ctx.derive();
    this._subscribeForChanges(ctx, doc);
    this._syncStates.set(doc.documentId, {
      syncState,
      ctx,
    });
  }

  private readonly _subscribeForChanges = (ctx: Context, doc: DocHandle<SpaceDoc>) => {
    const handler = () => {
      this._docsWithPendingUpdates.add(doc.documentId);
      this._sendUpdatesJob!.trigger();
    };
    doc.on('heads-changed', handler);
    ctx.onDispose(() => doc.off('heads-changed', handler));
  };

  private async _checkAndSendUpdates() {
    const updates: DocumentUpdate[] = [];

    const docsWithPendingUpdates = Array.from(this._docsWithPendingUpdates);
    this._docsWithPendingUpdates.clear();

    for (const documentId of docsWithPendingUpdates) {
      const syncState = this._syncStates.get(documentId)?.syncState;
      invariant(syncState, 'Sync state for document not found');
      const update = syncState.getNextMutation();
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
}
