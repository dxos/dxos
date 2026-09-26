//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { type EditorView, keymap } from '@codemirror/view';

export type SubmitOptions = {
  fireIfEmpty?: boolean;
  onSubmit?: (text: string) => boolean | void;
};

/**
 * Handles Enter and Shift-Enter.
 */
export const submit = ({ fireIfEmpty = false, onSubmit }: SubmitOptions = {}): Extension => {
  return [
    Prec.highest(
      keymap.of([
        {
          key: 'Enter',
          preventDefault: true,
          run: (view) => {
            const text = view.state.doc.toString().trim();
            if (onSubmit && (fireIfEmpty || text.length > 0)) {
              const reset = onSubmit(text);
              if (reset) {
                // Clear the document after calling onEnter.
                view.dispatch({
                  changes: {
                    from: 0,
                    to: view.state.doc.length,
                    insert: '',
                  },
                });
              }
            }

            return true;
          },
        },
        {
          key: 'Shift-Enter',
          preventDefault: true,
          run: (view) => {
            // Replace the selection (handles ranges and multiple cursors), not just the main head.
            view.dispatch(view.state.replaceSelection('\n'));
            return true;
          },
        },
      ]),
    ),
  ];
};

export type SubmitOnModEnterOptions = {
  onSubmit: (text: string) => void;
};

/**
 * Handles Cmd-Enter or Ctrl-Enter, on any platform, as an explicit submit for a multi-line field
 * where Enter must stay a newline.
 */
export const submitOnModEnter = ({ onSubmit }: SubmitOnModEnterOptions): Extension => {
  const run = (view: EditorView) => {
    onSubmit(view.state.doc.toString());
    return true;
  };

  // Highest precedence so the markdown keymap's own Mod-Enter never inserts a line first; both
  // modifiers are bound explicitly since `Mod` means only one of them per platform.
  return Prec.highest(
    keymap.of([
      { key: 'Meta-Enter', preventDefault: true, run },
      { key: 'Ctrl-Enter', preventDefault: true, run },
    ]),
  );
};
