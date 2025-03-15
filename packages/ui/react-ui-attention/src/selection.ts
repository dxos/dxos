//
// Copyright 2025 DXOS.org
//

import { untracked } from '@preact/signals-core';

import { create, type ReactiveObject } from '@dxos/live-object';

/**
 * Manages selection state for different contexts.
 * Each context maintains its own list of selected IDs.
 */
// TODO(burdon): Review/remove this abstraction. Selection should be managed by specific components.
export class SelectionManager {
  private readonly _state = create<{ selections: Record<string, Set<string>> }>({ selections: {} });

  constructor(initial: Record<string, Set<string>> = {}) {
    if (Object.keys(initial).length > 0) {
      untracked(() => {
        this._state.selections = initial;
      });
    }
  }

  get selections(): ReactiveObject<Record<string, Set<string>>> {
    return this._state.selections;
  }

  getSelection(contextId: string): Set<string> {
    if (!this.selections[contextId]) {
      untracked(() => {
        this._state.selections[contextId] = new Set();
      });
    }
    return this.selections[contextId];
  }

  updateSelection(contextId: string, selectedIds: Set<string> | string[]) {
    untracked(() => {
      this._state.selections[contextId] = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
    });
  }

  clearSelection(contextId: string) {
    untracked(() => {
      this._state.selections[contextId] = new Set();
    });
  }

  toggleSelection(contextId: string, id: string) {
    untracked(() => {
      const current = this.getSelection(contextId);
      if (current.has(id)) {
        current.delete(id);
      } else {
        current.add(id);
      }
    });
  }
}
