//
// Copyright 2024 DXOS.org
//

import { type Signal, signal, type ReadonlySignal } from '@preact/signals-core';
import { useMemo } from 'react';

import { useEditorContext } from './useEditorContext';

/**
 * Reactive selection model.
 */
export class SelectionModel {
  private readonly _selected: Signal<Record<string, boolean>> = signal({});

  /**
   * Reactive selection.
   */
  get selected(): ReadonlySignal<Record<string, boolean>> {
    return this._selected;
  }

  get ids(): readonly string[] {
    return Object.keys(this._selected.value);
  }

  contains(id: string) {
    return this._selected.value[id];
  }

  clear() {
    this._selected.value = {};
  }

  setSelected(ids: string[], shift = false) {
    this._selected.value = ids.reduce((acc, id) => ({ ...acc, [id]: true }), shift ? this._selected.value : {});
  }

  toggleSelected(ids: string[], shift = false) {
    this._selected.value = ids.reduce(
      (acc, id) => ({ ...acc, [id]: !this._selected.value[id] }),
      shift ? this._selected.value : {},
    );
  }
}

/**
 * Reactive selection model.
 */
export const useSelected = (): ReadonlySignal<Record<string, boolean>> => {
  const { selection } = useEditorContext();
  return useMemo(() => selection.selected, [selection]);
};
