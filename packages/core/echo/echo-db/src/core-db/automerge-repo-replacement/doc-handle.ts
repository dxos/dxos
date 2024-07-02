//
// Copyright 2024 DXOS.org
//

import { EventEmitter } from 'node:stream';

import { Trigger, TriggerState } from '@dxos/async';
import { next as A, type Heads, type Doc } from '@dxos/automerge/automerge';
import { stringifyAutomergeUrl, type DocHandleOptions, type DocumentId } from '@dxos/automerge/automerge-repo';
import { invariant } from '@dxos/invariant';

export type ChangeEvent<T> = {
  handle: DocHandleReplacement<T>;
  doc: A.Doc<T>;
  patches: A.Patch[];
};

export class DocHandleReplacement<T> extends EventEmitter {
  private readonly _ready = new Trigger();
  private _doc: A.Doc<T>;

  private _lastSyncedHeads: A.Heads = [];

  constructor(
    private readonly _documentId: DocumentId,
    options: DocHandleOptions<T> = {},
    private readonly _callbacks?: {
      onDelete: () => void;
    },
  ) {
    super();
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

  get state() {
    return this._ready.state === TriggerState.RESOLVED ? 'ready' : 'pending';
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

  isReady(): boolean {
    return this._ready.state === TriggerState.RESOLVED;
  }

  change(fn: (doc: A.Doc<T>) => void, opts?: A.ChangeOptions<any>): void {
    invariant(this._doc, 'DocHandleReplacement.change called on deleted doc');
    const headsBefore = A.getHeads(this._doc);
    this._doc = opts ? A.change(this._doc, opts, fn) : A.change(this._doc, fn);
    this.emit('change', {
      handle: this,
      doc: this._doc,
      patches: A.diff(this._doc, headsBefore, A.getHeads(this._doc)),
    });
  }

  changeAt(heads: A.Heads, fn: (doc: A.Doc<T>) => void, opts?: A.ChangeOptions<any>): Heads | undefined {
    invariant(this._doc, 'DocHandleReplacement.changeAt called on deleted doc');
    const { newDoc, newHeads } = opts ? A.changeAt(this._doc, heads, opts, fn) : A.changeAt(this._doc, heads, fn);

    this._doc = newDoc;
    this.emit('change', {
      handle: this,
      doc: this._doc,
      patches: A.diff(this._doc, heads, A.getHeads(this._doc)),
    });
    return newHeads || undefined;
  }

  delete(): void {
    this._callbacks?.onDelete();
    this.emit('delete', { handle: this });
    this._doc = undefined as any as Doc<T>;
  }

  /**
   * @internal
   */
  _getLastWriteMutation(): Uint8Array | undefined {
    invariant(this._doc, 'Doc is deleted, cannot get last write mutation');

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
    invariant(this._doc, 'Doc is deleted, cannot write mutation');
    this._doc = A.loadIncremental(this._doc, mutation);
    this._ready.wake();
  }
}
