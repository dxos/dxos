//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';

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
            view.dispatch({
              changes: {
                from: view.state.selection.main.head,
                insert: '\n',
              },
              selection: {
                anchor: view.state.selection.main.head + 1,
                head: view.state.selection.main.head + 1,
              },
            });
            return true;
          },
        },
      ]),
    ),
  ];
};
