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
  #heads: string[];
  #doc: A.Doc<T>;
  /** Set while this handle's own change runs, which emits once afterwards with source `change`. */
  #local = false;

  readonly tab: TabDoc<T>;

  constructor(tab: TabDoc<T>) {
    super();
    this.tab = tab;
    this.#heads = tab.heads();
    this.#doc = tab.doc();
    // Changes the worker delivers; local changes emit from `change` below with their own source.
    tab.on(() => this.#emitChange('host'));
  }

  doc(): A.Doc<T> {
    return this.tab.doc();
  }

  change(callback: A.ChangeFn<T>, options?: A.ChangeOptions<T>): void {
    this.#local = true;
    try {
      this.tab.change(callback, options);
    } finally {
      this.#local = false;
    }
    this.#emitChange('change');
  }

  changeAt(heads: A.Heads, callback: A.ChangeFn<T>, options?: A.ChangeOptions<T>): A.Heads | undefined {
    this.#local = true;
    try {
      return this.tab.changeAt(heads, callback, options);
    } finally {
      this.#local = false;
      this.#emitChange('change');
    }
  }

  #emitChange(source: 'change' | 'host'): void {
    if (this.#local) {
      return;
    }
    const heads = this.tab.heads();
    if (heads.join(',') === this.#heads.join(',')) {
      return;
    }
    const before = this.#doc;
    const patches = this.tab.diff(this.#heads, heads);
    this.#heads = heads;
    this.#doc = this.tab.doc();
    this.emit('change', { handle: this, doc: this.#doc, patches, patchInfo: { before, after: this.#doc, source } });
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
