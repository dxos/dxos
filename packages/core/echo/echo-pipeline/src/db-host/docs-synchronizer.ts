//
// Copyright 2024 DXOS.org
//

import { DeferredTask, sleep } from '@dxos/async';
import { type DocHandle, type DocumentId } from '@dxos/automerge/automerge-repo';
import { type Context, Resource } from '@dxos/context';
import { type SpaceDoc } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type BatchedDocumentUpdates, type DocumentUpdate } from '@dxos/protocols/proto/dxos/echo/service';

import { DocSyncState } from './doc-sync-state';

const UPDATE_BATCH_INTERVAL = 100;

export type DocumentsSynchronizerParams = {
  onDocumentsMutations: (updates: BatchedDocumentUpdates) => void;
};

export class DocsSynchronizer extends Resource {
  private readonly _syncStates = new Map<DocumentId, { syncState: DocSyncState<SpaceDoc>; unsub: () => void }>();
  /**
   * Documents that have pending updates.
   * Used to batch updates.
   */
  private readonly _docsWithPendingUpdates = new Set<DocumentId>();

  /**
   * Job that schedules if there are pending updates.
   */
  private readonly _run = new DeferredTask(this._ctx, async () => {
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
      this._params.onDocumentsMutations({ updates });
      await sleep(UPDATE_BATCH_INTERVAL);
    }
  });

  constructor(private readonly _params: DocumentsSynchronizerParams) {
    super();
  }

  protected override async _close(ctx: Context): Promise<void> {
    for (const { unsub } of this._syncStates.values()) {
      unsub();
    }
    this._syncStates.clear();
  }

  addDocuments(documents: DocHandle<SpaceDoc>[]) {
    const initialMutations: DocumentUpdate[] = [];
    for (const doc of documents) {
      invariant(!this._syncStates.has(doc.documentId), 'Document already being synced');
      const syncState = new DocSyncState(doc);
      const unsub = this._subscribeForChanges(doc);
      initialMutations.push({ documentId: doc.documentId, mutation: syncState.getInitMutation() });

      this._syncStates.set(doc.documentId, {
        syncState,
        unsub,
      });
    }

    if (initialMutations.length > 0) {
      this._params.onDocumentsMutations({ updates: initialMutations });
    }
  }

  removeDocuments(documentIds: DocumentId[]) {
    for (const documentId of documentIds) {
      this._syncStates.get(documentId)?.unsub();
      this._syncStates.delete(documentId);
      this._docsWithPendingUpdates.delete(documentId);
    }
  }

  private readonly _subscribeForChanges = (doc: DocHandle<SpaceDoc>) => {
    const handler = () => {
      this._docsWithPendingUpdates.add(doc.documentId);
      this._run.schedule();
    };
    doc.on('change', handler);
    return () => doc.off('change', handler);
  };
}
