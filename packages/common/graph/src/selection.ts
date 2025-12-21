//
// Copyright 2024 DXOS.org
//

import { type ReadonlySignal, type Signal, computed, signal } from '@preact/signals-core';

import { invariant } from '@dxos/invariant';

/**
 * Reactive selection model.
 */
export class SelectionModel {
  private readonly _selected: Signal<Set<string>> = signal(new Set<string>());
  private readonly _selectedIds = computed(() => Array.from(this._selected.value.values()));

  constructor(private readonly _singleSelect: boolean = false) {}

  toJSON(): { selected: string[] } {
    return {
      selected: Array.from(this._selected.value.values()),
    };
  }

  get size(): number {
    return this._selected.value.size;
  }

  get selected(): ReadonlySignal<string[]> {
    return this._selectedIds;
  }

  contains(id: string): boolean {
    return this._selected.value.has(id);
  }

  clear(): void {
    this._selected.value = new Set();
  }

  add(id: string): void {
    invariant(id);
    this._selected.value = new Set<string>(
      this._singleSelect ? [id] : [...Array.from(this._selected.value.values()), id],
    );
  }

  remove(id: string): void {
    invariant(id);
    this._selected.value = new Set<string>(Array.from(this._selected.value.values()).filter((_id) => _id !== id));
  }

  // TODO(burdon): Handle single select.

  setSelected(ids: string[], subtract = false): void {
    this._selected.value = new Set([...(subtract ? Array.from(this._selected.value.values()) : []), ...ids]);
  }

  toggleSelected(ids: string[], subtract = false): void {
    const set = new Set<string>(subtract ? Array.from(this._selected.value.values()) : undefined);
    ids.forEach((id) => {
      if (this._selected.value.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
    });

    this._selected.value = set;
  }
}
