//
// Copyright 2024 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';

import { invariant } from '@dxos/invariant';

/**
 * Reactive selection model.
 */
export class SelectionModel {
  private readonly _registry: Registry.Registry;
  private readonly _selected: Atom.Writable<Set<string>>;

  constructor(private readonly _singleSelect: boolean = false) {
    this._registry = Registry.make();
    this._selected = Atom.make<Set<string>>(new Set<string>());
  }

  /**
   * Returns the selected IDs atom for subscription.
   */
  get selected(): Atom.Atom<Set<string>> {
    return this._selected;
  }

  /**
   * Gets the current selected IDs as a Set.
   */
  getSelected(): Set<string> {
    return this._registry.get(this._selected);
  }

  /**
   * Gets the current selected IDs as an array.
   */
  getSelectedIds(): string[] {
    return Array.from(this._registry.get(this._selected).values());
  }

  /**
   * Subscribe to selection changes.
   */
  subscribe(cb: (selected: Set<string>) => void): () => void {
    // Prime the atom by reading before subscribing.
    this._registry.get(this._selected);

    return this._registry.subscribe(this._selected, () => {
      cb(this._registry.get(this._selected));
    });
  }

  toJSON(): { selected: string[] } {
    return {
      selected: this.getSelectedIds(),
    };
  }

  /**
   * Gets the current selection size.
   */
  getSize(): number {
    return this._registry.get(this._selected).size;
  }

  contains(id: string): boolean {
    return this._registry.get(this._selected).has(id);
  }

  clear(): void {
    this._registry.set(this._selected, new Set());
  }

  add(id: string): void {
    invariant(id);
    const current = this._registry.get(this._selected);
    this._registry.set(
      this._selected,
      new Set<string>(this._singleSelect ? [id] : [...Array.from(current.values()), id]),
    );
  }

  remove(id: string): void {
    invariant(id);
    const current = this._registry.get(this._selected);
    this._registry.set(this._selected, new Set<string>(Array.from(current.values()).filter((_id) => _id !== id)));
  }

  // TODO(burdon): Handle single select.

  setSelected(ids: string[], subtract = false): void {
    const current = this._registry.get(this._selected);
    this._registry.set(this._selected, new Set([...(subtract ? Array.from(current.values()) : []), ...ids]));
  }

  toggleSelected(ids: string[], subtract = false): void {
    const current = this._registry.get(this._selected);
    const set = new Set<string>(subtract ? Array.from(current.values()) : undefined);
    ids.forEach((id) => {
      if (current.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
    });

    this._registry.set(this._selected, set);
  }
}
