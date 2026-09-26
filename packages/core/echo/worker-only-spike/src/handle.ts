//
// Copyright 2026 DXOS.org
//

import type * as A from '@automerge/automerge';

import type { Doc } from '@dxos/echo-client';

import { type TabDoc } from './tab.ts';

/** ECHO's `Doc.Handle` over a tab document. */
export class SpikeHandle<T> implements Doc.Handle<T> {
  readonly #unsubscribe = new Map<() => void, () => void>();

  readonly tab: TabDoc<T>;

  constructor(tab: TabDoc<T>) {
    this.tab = tab;
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

  addListener(_event: 'change', listener: () => void): void {
    this.#unsubscribe.set(listener, this.tab.on(listener));
  }

  removeListener(_event: 'change', listener: () => void): void {
    this.#unsubscribe.get(listener)?.();
    this.#unsubscribe.delete(listener);
  }
}
