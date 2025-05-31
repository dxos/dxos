//
// Copyright 2024 DXOS.org
//

import { computed, signal, type ReadonlySignal, type Signal } from '@preact/signals-core';

/**
 * Reactive selection model.
 */
// TOOD(burdon): Option for single-select.
export class SelectionModel {
  private readonly _selected: Signal<Set<string>> = signal(new Set<string>());
  private readonly _selectedIds = computed(() => Array.from(this._selected.value.values()));

  get size(): number {
    return this._selected.value.size;
  }

  get selected(): ReadonlySignal<string[]> {
    return this._selectedIds;
  }

  contains(id: string) {
    return this._selected.value.has(id);
  }

  clear() {
    this._selected.value = new Set();
  }

  add(id: string) {
    this._selected.value = new Set<string>([...Array.from(this._selected.value.values()), id]);
  }

  remove(id: string) {
    this._selected.value = new Set<string>(Array.from(this._selected.value.values()).filter((_id) => _id !== id));
  }

  setSelected(ids: string[], shift = false) {
    this._selected.value = new Set([...(shift ? Array.from(this._selected.value.values()) : []), ...ids]);
  }

  toggleSelected(ids: string[], shift = false) {
    const set = new Set<string>(shift ? Array.from(this._selected.value.values()) : undefined);
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
