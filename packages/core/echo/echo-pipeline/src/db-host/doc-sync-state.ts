//
// Copyright 2024 DXOS.org
//

import { next as A } from '@dxos/automerge/automerge';
import { type DocHandle, type Heads } from '@dxos/automerge/automerge-repo';

/**
 * Utility to track last sync state between client and Repo.
 */
export class DocSyncState<T> {
  private _lastSentHead?: Heads;

  constructor(private readonly _handle: DocHandle<T>) {}

  getNextMutation(): Uint8Array | void {
    const doc = this._handle.docSync();
    if (!doc) {
      return;
    }
    const mutation = this._lastSentHead ? A.saveSince(doc, this._lastSentHead) : A.save(doc);
    if (mutation.length === 0) {
      return;
    }
    this._lastSentHead = A.getHeads(doc);
    return mutation;
  }

  write(mutation: Uint8Array) {
    this._handle.update((doc) => {
      const headsBefore = A.getHeads(doc);
      const newDoc = A.loadIncremental(doc, mutation);
      if (headsBefore.join('') === this._lastSentHead?.join('')) {
        this._lastSentHead = A.getHeads(newDoc);
      }
      return newDoc;
    });
  }
}
