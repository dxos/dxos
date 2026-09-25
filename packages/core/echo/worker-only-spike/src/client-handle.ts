//
// Copyright 2026 DXOS.org
//

import { EventEmitter } from 'eventemitter3';

import { type ClientDocHandle, type ClientDocHandleEvents } from '@dxos/echo-client';

import { type TabDoc } from './tab.ts';

let nextId = 0;

/** The database layer's document handle over a tab document, so `ObjectCore` binds to it unmodified. */
export class SpikeClientHandle extends EventEmitter<ClientDocHandleEvents<any>> implements ClientDocHandle<any> {
  readonly url = undefined;
  readonly documentId = undefined;
  readonly state = 'ready';
  readonly _internalId = `spike-${nextId++}`;
  #heads: string[];
  #doc: any;

  readonly tab: TabDoc;

  constructor(tab: TabDoc) {
    super();
    this.tab = tab;
    this.#heads = tab.heads();
    this.#doc = tab.doc();
    // Changes the worker delivers; local changes emit from `change` below with their own source.
    tab.on(() => this.#emitChange('host'));
  }

  doc(): any {
    return this.tab.doc();
  }

  change(callback: (doc: any) => void, options?: { time?: number; message?: string }): void {
    this.#local = true;
    try {
      this.tab.change(callback, options);
    } finally {
      this.#local = false;
    }
    this.#emitChange('change');
  }

  changeAt(
    heads: string[],
    callback: (doc: any) => void,
    options?: { time?: number; message?: string },
  ): string[] | undefined {
    this.#local = true;
    try {
      return this.tab.changeAt(heads, callback, options);
    } finally {
      this.#local = false;
      this.#emitChange('change');
    }
  }

  #local = false;

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
