//
// Copyright 2026 DXOS.org
//

import * as AppSettings from '@dxos/app-toolkit/AppSettings';

import { type Binding } from './binding.ts';

/** Read and write access to the settings store's two layers. */
export type Store = {
  read: () => AppSettings.Snapshot;
  update: (fn: (draft: AppSettings.Draft) => void) => void;
};

/**
 * Two-way reconciler for one namespace. {@link Reconciler.pull} and {@link Reconciler.push} are
 * guarded against reentrancy: a push writes ECHO, whose change notification would pull straight back.
 */
export class Reconciler {
  /** Values last known to be in agreement, and the base every local edit is diffed against. */
  #agreed: AppSettings.Values;
  #busy = false;

  constructor(
    private readonly _store: Store,
    private readonly _binding: Binding,
  ) {
    this.#agreed = this.#resolved();
  }

  get namespace(): string {
    return this._binding.namespace;
  }

  /** The values in effect on this device, defaults included. */
  current(): AppSettings.Values {
    return this.#resolved();
  }

  /** Whether taking the namespace local pins the keys in effect. @see {@link Binding.freezes} */
  get freezes(): boolean {
    return this._binding.freezes ?? false;
  }

  /** The namespace's own store, which holds the value of every pinned key. */
  local(): AppSettings.Values {
    return this._binding.read();
  }

  /** First reconciliation: the store wins for keys it holds, and local-only keys are adopted. */
  seed(): void {
    const stored = this.#stored();
    const local = this._binding.read();
    const merged = { ...local, ...stored };
    this.#guard(() => {
      this._store.update((draft) => {
        AppSettings.applyResolved(draft, this._binding.namespace, stored, merged);
      });
      this._binding.write(this.#resolved());
      this.#agreed = this.#resolved();
    });
  }

  /** Store changed: put the newly resolved values into effect locally. */
  pull(): void {
    this.#guard(() => {
      const resolved = this.#resolved();
      if (AppSettings.changedKeys(this.#agreed, resolved).length === 0) {
        return;
      }

      // Recorded only once the write lands: a binding that throws leaves the old baseline, so the
      // next pull retries instead of skipping a change it never applied.
      this._binding.write(resolved);
      this.#agreed = resolved;
    });
  }

  /** Local value changed: route each changed key to the layer that owns it. */
  push(): void {
    this.#guard(() => {
      const local = this._binding.read();
      const before = this.#baseline(local);
      if (AppSettings.changedKeys(before, local).length === 0) {
        return;
      }

      this._store.update((draft) => {
        AppSettings.applyResolved(draft, this._binding.namespace, before, local);
      });
      this.#agreed = this.#resolved();
    });
  }

  /**
   * What a local edit is diffed against. A sparse binding is narrowed to the keys it reports:
   * diffing against the ones it omits would read as a deletion and take the account's value with it.
   */
  #baseline(local: AppSettings.Values): AppSettings.Values {
    if (!this._binding.sparse) {
      return this.#agreed;
    }

    return Object.fromEntries(Object.keys(local).map((key) => [key, this.#agreed[key]]));
  }

  /** Values held by the store for this namespace, with no local defaults mixed in. */
  #stored(): AppSettings.Values {
    return AppSettings.resolve(this._store.read(), this._binding.namespace);
  }

  #resolved(): AppSettings.Values {
    return AppSettings.resolve(this._store.read(), this._binding.namespace, this._binding.read());
  }

  #guard(fn: () => void): void {
    if (this.#busy) {
      return;
    }

    this.#busy = true;
    try {
      fn();
    } finally {
      this.#busy = false;
    }
  }
}
