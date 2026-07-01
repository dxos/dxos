//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, StateEffect, StateField } from '@codemirror/state';

/**
 * Generic shared "busy" flag that extensions use to coordinate exclusive use of the cursor region.
 * One extension sets it (e.g. transcription while a pending block is active); others read it (e.g. a
 * placeholder hint) to suppress themselves while something else owns the caret.
 */
export const setBusy = StateEffect.define<boolean>();

export const busyState = StateField.define<boolean>({
  create: () => false,
  update: (value, tr) => {
    let next = value;
    for (const effect of tr.effects) {
      if (effect.is(setBusy)) {
        next = effect.value;
      }
    }

    return next;
  },
});

/** Whether any extension has flagged the editor busy. Safe when the field is absent (returns false). */
export const isBusy = (state: EditorState): boolean => state.field(busyState, false) ?? false;

/** Contributes the shared busy flag. Include once; setters/readers reference the same field. */
export const busy = (): Extension => busyState;
