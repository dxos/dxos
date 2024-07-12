//
// Copyright 2024 DXOS.org
//

import { EventEmitter } from 'eventemitter3';

import { Trigger, TriggerState } from '@dxos/async';
import { next as A, type Heads, type Doc } from '@dxos/automerge/automerge';
import { stringifyAutomergeUrl, type DocHandleOptions, type DocumentId } from '@dxos/automerge/automerge-repo';
import { invariant } from '@dxos/invariant';

import { type IDocHandle } from '../core-db';

export type ChangeEvent<T> = {
  handle: DocHandleProxy<T>;
  doc: A.Doc<T>;
  patches: A.Patch[];
  patchInfo: { before: A.Doc<T>; after: A.Doc<T>; source: 'change' };
};

export type ClientDocHandleEvents<T> = {
  change: ChangeEvent<T>;
  delete: { handle: DocHandleProxy<T> };
};

/**
 * A client-side `IDocHandle` implementation.
 * Syncs with a Automerge Repo in shared worker.
 * Inspired by Automerge's `DocHandle`.
 */
export class DocHandleProxy<T> extends EventEmitter<ClientDocHandleEvents<T>> implements IDocHandle<T> {
  private readonly _ready = new Trigger();
  private _doc: A.Doc<T>;

  private _lastSentHeads: A.Heads = [];
  /**
   * Heads that are currently being synced.
   * If sync is successful, they will be moved to `_lastSentHeads`.
   */
  private _currentlySendingHeads: A.Heads = [];

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
    invariant(this._doc, 'DocHandleProxy.change called on deleted doc');
    const before = this._doc;
    const headsBefore = A.getHeads(this._doc);
    this._doc = opts ? A.change(this._doc, opts, fn) : A.change(this._doc, fn);
    this.emit('change', {
      handle: this,
      doc: this._doc,
      patches: A.diff(this._doc, headsBefore, A.getHeads(this._doc)),
      patchInfo: { before, after: this._doc, source: 'change' },
    });
  }

  changeAt(heads: A.Heads, fn: (doc: A.Doc<T>) => void, opts?: A.ChangeOptions<any>): Heads | undefined {
    invariant(this._doc, 'DocHandleProxy.changeAt called on deleted doc');
    const before = this._doc;
    const headsBefore = A.getHeads(this._doc);
    const { newDoc, newHeads } = opts ? A.changeAt(this._doc, heads, opts, fn) : A.changeAt(this._doc, heads, fn);

    this._doc = newDoc;
    this.emit('change', {
      handle: this,
      doc: this._doc,
      patches: newHeads ? A.diff(this._doc, headsBefore, newHeads) : [],
      patchInfo: { before, after: this._doc, source: 'change' },
    });
    return newHeads || undefined;
  }

  update(updateCallback: (doc: A.Doc<T>) => A.Doc<T>): void {
    invariant(this._doc, 'DocHandleProxy.update called on deleted doc');
    const before = this._doc;
    const headsBefore = A.getHeads(this._doc);
    this._doc = updateCallback(this._doc);
    this.emit('change', {
      handle: this,
      doc: this._doc,
      patches: A.diff(this._doc, headsBefore, A.getHeads(this._doc)),
      patchInfo: { before, after: this._doc, source: 'change' },
    });
  }

  delete(): void {
    this._callbacks?.onDelete();
    this.emit('delete', { handle: this });
    this._doc = undefined as any as Doc<T>;
  }

  /**
   * Get pending changes since last write.
   * @internal
   */
  _getPendingChanges(): Uint8Array | undefined {
    invariant(this._doc, 'Doc is deleted, cannot get last write mutation');
    if (A.equals(A.getHeads(this._doc), this._lastSentHeads)) {
      return;
    }

    const mutation = A.saveSince(this._doc, this._lastSentHeads);
    if (mutation.length === 0) {
      return;
    }
    this._currentlySendingHeads = A.getHeads(this._doc);
    return mutation;
  }

  /**
   * Confirm that the last write was successful.
   * @internal
   */
  _confirmSync() {
    this._lastSentHeads = this._currentlySendingHeads;
  }

  /**
   * Update the doc with a foreign mutation from worker.
   * @internal
   */
  _integrateHostUpdate(mutation: Uint8Array) {
    invariant(this._doc, 'Doc is deleted, cannot write mutation');
    const before = this._doc;
    const headsBefore = A.getHeads(this._doc);
    this._doc = A.loadIncremental(this._doc, mutation);

    if (A.equals(headsBefore, this._lastSentHeads)) {
      this._lastSentHeads = A.getHeads(this._doc);
    }

    this._ready.wake();

    this.emit('change', {
      handle: this,
      doc: this._doc,
      patches: A.diff(this._doc, headsBefore, A.getHeads(this._doc)),
      patchInfo: { before, after: this._doc, source: 'change' },
    });
  }
}
