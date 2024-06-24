//
// Copyright 2024 DXOS.org
//

import { getHeads, save, saveSince, loadIncremental } from '@dxos/automerge/automerge';
import { type DocHandle, type Heads } from '@dxos/automerge/automerge-repo';

/**
 * Class to synchronize docs between host and thin client.
 */
export class DocSyncState<T> {
  private _syncedHeads: Heads;

  constructor(private readonly _handle: DocHandle<T>) {}

  getInitMutation(): Uint8Array {
    const doc = this._handle.docSync();
    const mutation = save(this._handle.docSync());
    this._syncedHeads = getHeads(doc);
    return mutation;
  }

  getNextMutation(): Uint8Array | void {
    const doc = this._handle.docSync();
    const mutation = saveSince(doc, this._syncedHeads);
    if (mutation.length === 0) {
      return undefined;
    }
    this._syncedHeads = getHeads(doc);
    return mutation;
  }

  receiveIncrementalMutation(mutation: Uint8Array) {
    this._handle.update(() => {
      return loadIncremental(this._handle.docSync(), mutation);
    });
  }
}
