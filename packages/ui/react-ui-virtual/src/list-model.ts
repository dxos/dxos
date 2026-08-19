//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

/**
 * What one change to the model actually was — told, never inferred.
 *
 * The virtualizer's anchor survives a prepend only if it knows the prepend happened (SPEC F-7.1);
 * the engine used to reconstruct that by scanning for the previous first id, which is the model's
 * knowledge recovered from its absence. Here the model says so. The identity scan still exists in
 * exactly one place — `replace`, the adapter for hosts that hand over a whole new array — because
 * that is the one caller that genuinely does not know.
 */
export type ListChange = {
  prepended?: number;
  appended?: number;
  /** Ids whose content changed in place — a streaming tail, an edit. */
  updated?: readonly string[];
};

export type ListModelOptions<T> = {
  items?: readonly T[];
  /** Identity of an item. Measurements, selection and decorations are all keyed by this. */
  getId: (item: T) => string;
};

/**
 * The low-level reactive collection the virtualizer binds to (SPEC: ListModel).
 *
 * Two faces on one state, deliberately: a plain synchronous face (`count`, `at`, `subscribe`) that
 * the virtualizer consumes without dragging an atom registry into every story and test, and an
 * atom face (`rowsAtom`) for hosts that live in atom-land — derivations (stops, decorations,
 * readouts) hang off the atom rather than becoming parallel props. Both are the same array; the
 * subscribe face is not a fallback but the binding's contract.
 */
export class ListModel<T> {
  #items: T[];
  readonly #getId: (item: T) => string;
  readonly #listeners = new Set<(change: ListChange) => void>();

  /** The rows as an atom, for derivations. Registry-managed by whoever consumes it. */
  readonly rowsAtom: Atom.Writable<readonly T[]>;
  readonly #registry: Registry.AtomRegistry;

  constructor({ items = [], getId }: ListModelOptions<T>) {
    this.#items = [...items];
    this.#getId = getId;
    this.rowsAtom = Atom.make<readonly T[]>(this.#items);
    // A model owns its registry so the atom face works without a provider; a host embedded in a
    // wider registry can still read `rowsAtom` through its own.
    this.#registry = Registry.make();
  }

  get count(): number {
    return this.#items.length;
  }

  get items(): readonly T[] {
    return this.#items;
  }

  getId = (index: number): string => {
    const item = this.#items[index];
    return item === undefined ? `missing-${index}` : this.#getId(item);
  };

  at = (index: number): T | undefined => this.#items[index];

  indexOf(id: string): number {
    return this.#items.findIndex((item) => this.#getId(item) === id);
  }

  subscribe(listener: (change: ListChange) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  append(items: readonly T[]): void {
    if (!items.length) {
      return;
    }

    this.#items = [...this.#items, ...items];
    this.#publish({ appended: items.length });
  }

  prepend(items: readonly T[]): void {
    if (!items.length) {
      return;
    }

    this.#items = [...items, ...this.#items];
    this.#publish({ prepended: items.length });
  }

  /** An item changed in place — same identity, new content. */
  update(id: string): void {
    this.#publish({ updated: [id] });
  }

  /**
   * Replace one item with a successor of the same identity — the streaming case for *frozen*
   * items. An ECHO object mutates and `update` announces it; a schema-made message is frozen, so
   * the chunk arrives as a fresh value under the old id. Same event either way: `updated`.
   */
  patch(id: string, next: T): void {
    const index = this.#items.findIndex((item) => this.#getId(item) === id);
    if (index < 0 || this.#getId(next) !== id) {
      return;
    }

    this.#items = [...this.#items.slice(0, index), next, ...this.#items.slice(index + 1)];
    this.#publish({ updated: [id] });
  }

  /**
   * The adapter for hosts that hand over a whole new array (a React prop, a query result).
   *
   * The one place the prepend inference survives, because this is the one caller that genuinely
   * does not know what changed: the old first item is found in the new array, and everything before
   * it was prepended. The virtualizer itself is always told (SPEC F-7.1).
   */
  replace(items: readonly T[]): void {
    const previous = this.#items;
    const previousFirst = previous.length ? this.#getId(previous[0]) : undefined;
    this.#items = [...items];

    let prepended = 0;
    if (previousFirst !== undefined && items.length > previous.length) {
      const grew = items.length - previous.length;
      for (let index = 1; index <= grew; index++) {
        if (items[index] !== undefined && this.#getId(items[index]) === previousFirst) {
          prepended = index;
          break;
        }
      }
    }

    const appended = prepended ? 0 : Math.max(0, items.length - previous.length);
    this.#publish({ prepended: prepended || undefined, appended: appended || undefined });
  }

  #publish(change: ListChange): void {
    this.#registry.set(this.rowsAtom, this.#items);
    for (const listener of this.#listeners) {
      listener(change);
    }
  }
}
