//
// Copyright 2026 DXOS.org
//

import type * as A from '@automerge/automerge';
import { EventEmitter } from 'eventemitter3';

import { type ClientDocHandle, type ClientDocHandleEvents } from '@dxos/echo-client';

import { type TabDoc } from './tab.ts';

let nextId = 0;

/** The database layer's document handle over a tab document, so `ObjectCore` binds to it unmodified. */
export class SpikeClientHandle<T> extends EventEmitter<ClientDocHandleEvents<T>> implements ClientDocHandle<T> {
  readonly url = undefined;
  readonly documentId = undefined;
  readonly state = 'ready';
  readonly _internalId = `spike-${nextId++}`;

  readonly tab: TabDoc<T>;

  constructor(tab: TabDoc<T>) {
    super();
    this.tab = tab;
    // The tab document reports each version with its patches, whether this tab or the worker made it.
    tab.on(({ before, after, patches, source }) =>
      this.emit('change', { handle: this, doc: after, patches, patchInfo: { before, after, source } }),
    );
  }

  doc(): A.Doc<T> {
    return this.tab.doc();
  }

  change(callback: A.ChangeFn<T>, options?: A.ChangeOptions<T>): void {
    this.tab.change(callback, options);
  }

  changeAt(heads: A.Heads, callback: A.ChangeFn<T>, options?: A.ChangeOptions<T>): A.Heads | undefined {
    return this.tab.changeAt(heads, callback, options);
  }

  whenReady(): Promise<void> {
    return Promise.resolve();
  }

  isReady(): boolean {
    return true;
  }

  whenSettledOnDisk(): Promise<boolean> {
    return Promise.resolve(true);
  }

  update(): void {
    throw new Error('A tab document has no Automerge document to replace');
  }

  delete(): void {
    this.emit('delete', { handle: this });
  }
}
