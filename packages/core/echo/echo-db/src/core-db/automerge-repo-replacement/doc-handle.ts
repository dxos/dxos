//
// Copyright 2024 DXOS.org
//

import { Trigger, Event } from '@dxos/async';
import { next as A } from '@dxos/automerge/automerge';
import { type DocHandleOptions, type DocumentId } from '@dxos/automerge/automerge-repo';

export class DocHandleReplacement<T> {
  private readonly _ready = new Trigger();
  private _doc: A.Doc<T>;

  private _lastSyncedHeads: A.Heads = [];

  /**
   * Emitted when the document is changed by public `change` method.
   */
  public readonly changed = new Event();

  constructor(
    public readonly documentId: DocumentId,
    options: DocHandleOptions<T> = {},
  ) {
    if (options.isNew) {
      // T should really be constrained to extend `Record<string, unknown>` (an automerge doc can't be
      // e.g. a primitive, an array, etc. - it must be an object). But adding that constraint creates
      // a bunch of other problems elsewhere so for now we'll just cast it here to make Automerge happy.
      this._doc = A.from(options.initialValue as Record<string, unknown>) as T;
      this._doc = A.emptyChange<T>(this._doc);
      this._ready.wake();
    } else {
      this._doc = A.init<T>();
    }
  }

  docSync(): A.Doc<T> {
    return this._doc;
  }

  async doc(): Promise<A.Doc<T>> {
    await this._ready.wait();
    return this._doc;
  }

  async whenReady(): Promise<void> {
    await this._ready.wait();
  }

  change(fn: (doc: A.Doc<T>) => void): void {
    this._doc = A.change(this._doc, fn);
  }

  /**
   * @internal
   */
  _getLastWriteMutation(): Uint8Array | undefined {
    const mutation = A.saveSince(this._doc, this._lastSyncedHeads);
    if (mutation.length === 0) {
      return;
    }
    this._lastSyncedHeads = A.getHeads(this._doc);
    return mutation;
  }

  /**
   * @internal
   */
  _incrementalUpdate(mutation: Uint8Array) {
    this._doc = A.loadIncremental(this._doc, mutation);
    this._ready.wake();
  }
}
