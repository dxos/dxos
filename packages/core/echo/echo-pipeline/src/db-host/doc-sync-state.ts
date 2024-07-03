//
// Copyright 2024 DXOS.org
//

import { next as A } from '@dxos/automerge/automerge';
import { type DocHandle, type Heads } from '@dxos/automerge/automerge-repo';

/**
 * Class to synchronize docs between host and thin client.
 */
export class DocSyncState<T> {
  private _syncedHeads: Heads = [];

  constructor(private readonly _handle: DocHandle<T>) {}

  getNextMutation(): Uint8Array | void {
    const doc = this._handle.docSync();
    if (!doc) {
      return;
    }
    const mutation = A.saveSince(doc, this._syncedHeads);
    if (mutation.length === 0) {
      return;
    }
    this._syncedHeads = A.getHeads(doc);
    return mutation;
  }

  write(mutation: Uint8Array) {
    this._handle.update((doc) => A.loadIncremental(doc, mutation));
    this._syncedHeads = A.getHeads(this._handle.docSync());
  }
}
