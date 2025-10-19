//
// Copyright 2025 DXOS.org
//

import { StateEffect, StateField } from '@codemirror/state';

export const modalStateEffect = StateEffect.define<boolean>();

/**
 * Determines if a modal dialog (e.g., popover) is active.
 */
export const modalStateField = StateField.define<boolean>({
  create: () => false,
  update: (value, tr) => {
    let newValue = value;
    for (const effect of tr.effects) {
      if (effect.is(modalStateEffect)) {
        newValue = effect.value;
      }
    }

    return newValue;
  },
});
