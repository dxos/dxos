//
// Copyright 2024 DXOS.org
//

import { Trigger, Event } from '@dxos/async';
import { next as A } from '@dxos/automerge/automerge';
import { stringifyAutomergeUrl, type DocHandleOptions, type DocumentId } from '@dxos/automerge/automerge-repo';

export type ChangeEvent<T> = {
  handle: DocHandleReplacement<T>;
  doc: A.Doc<T>;
  patches: A.Patch[];
};

export class DocHandleReplacement<T> {
  private readonly _ready = new Trigger();
  private _doc: A.Doc<T>;

  private _lastSyncedHeads: A.Heads = [];

  /**
   * Emitted when the document is changed by public `change` method.
   */
  public readonly changed = new Event<ChangeEvent<T>>();

  constructor(
    private readonly _documentId: DocumentId,
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

  get url() {
    return stringifyAutomergeUrl(this._documentId);
  }

  get documentId(): DocumentId {
    return this._documentId;
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
    const headsBefore = A.getHeads(this._doc);
    this._doc = A.change(this._doc, fn);
    this.changed.emit({ handle: this, doc: this._doc, patches: A.diff(this._doc, headsBefore, A.getHeads(this._doc)) });
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
