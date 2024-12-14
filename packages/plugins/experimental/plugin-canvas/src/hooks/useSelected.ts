//
// Copyright 2024 DXOS.org
//

import { type Signal, signal, type ReadonlySignal } from '@preact/signals-core';
import { useMemo } from 'react';

import { useEditorContext } from './useEditorContext';

/**
 *
 */
export class SelectionModel {
  private readonly _selected: Signal<Record<string, boolean>> = signal({});

  get ids(): string[] {
    return Object.keys(this._selected.value);
  }

  get selected(): ReadonlySignal<Record<string, boolean>> {
    return this._selected;
  }

  contains(id: string) {
    return this._selected.value[id];
  }

  clear() {
    this._selected.value = {};
  }

  setSelected(ids: string[], shift = false) {
    if (!shift) {
      this.clear();
    }
    ids.forEach((id) => (this._selected.value[id] = true));
  }

  toggleSelected(ids: string[], shift = false) {
    if (!shift) {
      this.clear();
    }
    ids.forEach((id) => (this.contains(id) ? delete this._selected.value[id] : (this._selected.value[id] = true)));
  }
}

/**
 *
 */
export const useSelected = (): ReadonlySignal<Record<string, boolean>> => {
  const { selection } = useEditorContext();
  return useMemo(() => selection.selected, [selection]);
};
