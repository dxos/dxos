//
// Copyright 2026 DXOS.org
//

import type * as AppSettings from '@dxos/app-toolkit/AppSettings';

import { type Binding } from './binding';
import { Reconciler, type Store } from './reconciler';

/**
 * Every namespace being reconciled against one store.
 *
 * Bindings arrive over the session as plugins activate, and the capability needs the whole set at
 * once — to pull them when either half of the store moves, and to release their subscriptions when
 * it shuts down.
 */
export class Sync {
  readonly #entries: Reconciler[] = [];
  readonly #unsubscribe: (() => void)[] = [];

  constructor(private readonly _store: Store) {}

  /** Reconcile one more namespace, seeding it before either direction can fire. */
  bind(binding: Binding): void {
    const reconciler = new Reconciler(this._store, binding);
    reconciler.seed();
    this.#entries.push(reconciler);
    const unsubscribe = binding.subscribe?.(() => reconciler.push());
    if (unsubscribe) {
      this.#unsubscribe.push(unsubscribe);
    }
  }

  /** Put newly resolved values into effect everywhere, after the store moved. */
  pull(): void {
    for (const reconciler of this.#entries) {
      reconciler.pull();
    }
  }

  /** One namespace's own store, which holds the value of every pinned key. */
  local(namespace: string): AppSettings.Values {
    return this.#entries.find((reconciler) => reconciler.namespace === namespace)?.local() ?? {};
  }

  dispose(): void {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
}
