//
// Copyright 2024 DXOS.org
//

import { StateEffect, StateField } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const focusEffect = StateEffect.define<boolean>();

export const focusField = StateField.define<boolean>({
  create: () => false,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(focusEffect)) {
        return effect.value;
      }
    }
    return value;
  },
});

/**
 * Manage focus.
 */
export const focus = [
  focusField,
  EditorView.domEventHandlers({
    focus: (event, view) => {
      setTimeout(() => view.dispatch({ effects: focusEffect.of(true) }));
    },
    blur: (event, view) => {
      setTimeout(() => view.dispatch({ effects: focusEffect.of(false) }));
    },
  }),
];
