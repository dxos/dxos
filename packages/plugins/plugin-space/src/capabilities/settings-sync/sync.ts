//
// Copyright 2026 DXOS.org
//

import type * as AppSettings from '@dxos/app-toolkit/AppSettings';

import { type Binding } from './binding.ts';
import { Reconciler, type Store } from './reconciler.ts';

/**
 * Every namespace being reconciled against one store. Bindings arrive over the session as plugins
 * activate, and the capability acts on the whole set at once.
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

  /** @see {@link Reconciler.local} */
  local(namespace: string): AppSettings.Values {
    return this.#find(namespace)?.local() ?? {};
  }

  /** Whether taking the namespace local pins the keys in effect. @see {@link Binding.freezes} */
  freezes(namespace: string): boolean {
    return this.#find(namespace)?.freezes ?? false;
  }

  #find(namespace: string): Reconciler | undefined {
    return this.#entries.find((reconciler) => reconciler.namespace === namespace);
  }

  dispose(): void {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
}
