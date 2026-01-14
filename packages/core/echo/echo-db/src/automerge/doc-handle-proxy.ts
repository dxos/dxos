//
// Copyright 2024 DXOS.org
//

import { next as A, type Doc } from '@automerge/automerge';
import { type DocumentId, stringifyAutomergeUrl } from '@automerge/automerge-repo';
import { EventEmitter } from 'eventemitter3';

import { Trigger, TriggerState } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

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

export type DocHandleProxyOptions<T> = {
  initialValue?: T;
  documentId?: DocumentId;
  onDelete: () => void;
};

/**
 * A client-side `IDocHandle` implementation.
 * Syncs with a Automerge Repo in shared worker.
 * Inspired by Automerge's `DocHandle`.
 */
export class DocHandleProxy<T> extends EventEmitter<ClientDocHandleEvents<T>> implements IDocHandle<T> {
  private readonly _ready = new Trigger();
  private _doc?: A.Doc<T> = undefined;

  private _lastSentHeads: A.Heads = [];
  /**
   * Heads that are currently being synced.
   * If sync is successful, they will be moved to `_lastSentHeads`.
   */
  private _currentlySendingHeads: A.Heads = [];
  /**
   * Identifier for internal usage.
   */
  private readonly _internalId = PublicKey.random().toHex();
  /**
   * Present if document is loading from a storage.
   * Undefined if document is new and still is being created.
   */
  private _documentId?: DocumentId;
  private readonly _onDelete: () => void;

  constructor({ documentId, initialValue, onDelete }: DocHandleProxyOptions<T>) {
    super();
    this._documentId = documentId;
    this._onDelete = onDelete;
    if (initialValue) {
      // T should really be constrained to extend `Record<string, unknown>` (an automerge doc can't be
      // e.g. a primitive, an array, etc. - it must be an object). But adding that constraint creates
      // a bunch of other problems elsewhere so for now we'll just cast it here to make Automerge happy.
      this._doc = A.from(initialValue as Record<string, unknown>) as T;
      this._doc = A.emptyChange<T>(this._doc);
    } else {
      this._doc = A.init<T>();
    }
  }

  /**
   * @internal
   */
  get internalId(): string {
    return this._internalId;
  }

  get url() {
    invariant(this._documentId, 'DocHandleProxy.url called on deleted doc');
    return stringifyAutomergeUrl(this._documentId);
  }

  get documentId(): DocumentId {
    invariant(this._documentId, 'DocHandleProxy.documentId called on deleted doc');
    return this._documentId;
  }

  /**
   * @internal
   */
  _setDocumentId(documentId: DocumentId): void {
    this._documentId = documentId;
  }

  get state() {
    return this._ready.state === TriggerState.RESOLVED ? 'ready' : 'pending';
  }

  doc(): A.Doc<T> {
    if (!this._doc) {
      throw new Error('DocHandleProxy.doc called on deleted doc');
    }
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

  changeAt(heads: A.Heads, fn: (doc: A.Doc<T>) => void, opts?: A.ChangeOptions<any>): A.Heads | undefined {
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
    return newHeads ?? undefined;
  }

  update(updateCallback: (doc: A.Doc<T>) => A.Doc<T>): void {
    invariant(this._doc, 'DocHandleProxy.update called on deleted doc');
    const before = this._doc;
    const headsBefore = A.getHeads(this._doc);
    const newDoc = updateCallback(this._doc);
    invariant(newDoc, 'DocHandleProxy.update returned undefined doc');
    this._doc = newDoc;
    this.emit('change', {
      handle: this,
      doc: this._doc,
      patches: A.diff(this._doc, headsBefore, A.getHeads(this._doc)),
      patchInfo: { before, after: this._doc, source: 'change' },
    });
  }

  delete(): void {
    this._onDelete();
    this.emit('delete', { handle: this });
    this._doc = undefined;
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
  _confirmSync(): void {
    this._lastSentHeads = this._currentlySendingHeads;
  }

  /**
   * Update the doc with a foreign mutation from worker.
   * @internal
   */
  _integrateHostUpdate(mutation: Uint8Array): void {
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
