//
// Copyright 2026 DXOS.org
//

import type { Doc } from '@dxos/echo-client';

import { type TabDoc } from './tab.ts';

/** ECHO's `Doc.Handle` over a tab document. */
export class SpikeHandle implements Doc.Handle {
  readonly #unsubscribe = new Map<() => void, () => void>();

  constructor(readonly tab: TabDoc) {}

  doc(): any {
    return this.tab.doc();
  }

  change(callback: (doc: any) => void, options?: { time?: number; message?: string }): void {
    this.tab.change(callback, options);
  }

  changeAt(
    heads: string[],
    callback: (doc: any) => void,
    options?: { time?: number; message?: string },
  ): string[] | undefined {
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
