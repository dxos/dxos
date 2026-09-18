//
// Copyright 2026 DXOS.org
//

import * as AppSettings from '@dxos/app-toolkit/AppSettings';

import { type Binding } from './binding.ts';

/** A binding whose `write` applies over several turns returns a promise; most return nothing. */
const isPromise = (value: unknown): value is Promise<void> =>
  typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';

/** Read and write access to the settings store's two layers. */
export type Store = {
  read: () => AppSettings.Snapshot;
  update: (fn: (draft: AppSettings.Draft) => void) => void;
};

/**
 * Two-way reconciler for one namespace. {@link Reconciler.pull} and {@link Reconciler.push} are
 * guarded against reentrancy: a push writes ECHO, whose change notification would pull straight back.
 *
 * The guard spans an asynchronous {@link Binding.write} too. A binding that applies over several
 * turns — enabling a plugin waits on its import — keeps reporting the pre-write value meanwhile, and
 * an unguarded notification in that window would publish it back over the value being applied.
 */
export class Reconciler {
  /** Values last known to be in agreement, and the base every local edit is diffed against. */
  #agreed: AppSettings.Values;
  #busy = false;
  /** Whether a reconciliation was dropped by the guard, so one runs again once the write lands. */
  #missed = false;

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
      return this.#write(this.#resolved());
    });
  }

  /** Store changed: put the newly resolved values into effect locally. */
  pull(): void {
    this.#guard(() => {
      const resolved = this.#resolved();
      const changed = AppSettings.changedKeys(this.#agreed, resolved);
      if (changed.length === 0) {
        return undefined;
      }

      return this.#write(resolved);
    });
  }

  /**
   * Local value changed: route each changed key to the layer that owns it, then put the newly
   * resolved values back into effect.
   *
   * Writing back matters as much as publishing. Resolution lets the account win for a key this
   * device does not pin, so a local edit to one key can leave another resolving to a shared value
   * this device has not applied. Recording that value as agreed without applying it would suppress
   * the pull that would have applied it, and leave the next push reporting the unapplied local
   * value as an edit — publishing it over the account's.
   */
  push(): void {
    this.#guard(() => {
      const local = this._binding.read();
      const before = this.#baseline(local);
      const changed = AppSettings.changedKeys(before, local);
      if (changed.length === 0) {
        return undefined;
      }

      this._store.update((draft) => {
        AppSettings.applyResolved(draft, this._binding.namespace, before, local);
      });
      return this.#write(this.#resolved());
    });
  }

  /**
   * Put values into effect locally, recording the new baseline only once they are. A binding that
   * fails leaves the old baseline, so the next reconciliation retries rather than skipping a change
   * it never applied.
   */
  #write(values: AppSettings.Values): Promise<void> | undefined {
    const applied = this._binding.write(values);
    if (!isPromise(applied)) {
      this.#agreed = values;
      return undefined;
    }

    return applied.then(() => {
      this.#agreed = values;
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

  #guard(fn: () => Promise<void> | undefined): void {
    if (this.#busy) {
      this.#missed = true;
      return;
    }

    this.#busy = true;
    let applied: Promise<void> | undefined;
    try {
      applied = fn();
    } finally {
      if (applied === undefined) {
        this.#release();
      }
    }

    // Rethrown once the guard is open: the failure still surfaces as an unhandled rejection, as it
    // did when every write was synchronous.
    void applied?.then(
      () => this.#release(),
      (error) => {
        this.#release();
        throw error;
      },
    );
  }

  /** Reopen the guard, replaying both directions if either was dropped while it was closed. */
  #release(): void {
    this.#busy = false;
    if (!this.#missed) {
      return;
    }

    this.#missed = false;
    this.pull();
    this.push();
  }
}
