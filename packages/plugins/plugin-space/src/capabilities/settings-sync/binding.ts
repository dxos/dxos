//
// Copyright 2026 DXOS.org
//

import * as AppSettings from '@dxos/app-toolkit/AppSettings';

/** One namespace's two-way link between a local value and the synced store. */
export type Binding = {
  namespace: string;
  /** The values in effect locally right now. */
  read: () => AppSettings.Values;
  /** Put resolved values into effect locally. */
  write: (values: AppSettings.Values) => void;
};

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

  /**
   * First reconciliation: the store wins for keys it holds, and keys only this device has are
   * adopted into the shared layer.
   */
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

      this.#agreed = resolved;
      this._binding.write(resolved);
    });
  }

  /** Local value changed: route each changed key to the layer that owns it. */
  push(): void {
    this.#guard(() => {
      const local = this._binding.read();
      if (AppSettings.changedKeys(this.#agreed, local).length === 0) {
        return;
      }

      this._store.update((draft) => {
        AppSettings.applyResolved(draft, this._binding.namespace, this.#agreed, local);
      });
      this.#agreed = this.#resolved();
    });
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
