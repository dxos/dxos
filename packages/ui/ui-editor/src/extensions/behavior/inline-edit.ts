//
// Copyright 2026 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

import { submit } from './submit';

export type InlineEditOptions = {
  /** Enter, or a blur when `commitOnBlur`. Receives the document. */
  onCommit?: (text: string) => void;
  /** Escape, or a blur otherwise. */
  onRevert?: () => void;
  /** Whether leaving the editor keeps the edit or discards it. */
  commitOnBlur?: boolean;
};

/**
 * Turns an editor into an inline-edit field: `Enter` commits rather than opening a line, `Escape`
 * reverts, and leaving does whichever the host asked for. `Shift-Enter` still inserts a newline,
 * so a multi-line value stays reachable.
 *
 * The document is one field's worth of text here, not a document, which is why `Enter` is free to
 * mean something else.
 */
export const inlineEdit = ({ onCommit, onRevert, commitOnBlur = true }: InlineEditOptions = {}): Extension => {
  return [
    // `submit` already owns Enter / Shift-Enter; only the escape hatch is new.
    submit({ fireIfEmpty: true, onSubmit: (text) => void onCommit?.(text) }),
    Prec.highest(
      keymap.of([
        {
          key: 'Escape',
          preventDefault: true,
          run: () => {
            onRevert?.();
            // Handled, so an editor inside a dialog does not also close it.
            return true;
          },
        },
      ]),
    ),
    EditorView.domEventHandlers({
      blur: (_event, view) => {
        if (commitOnBlur) {
          onCommit?.(view.state.doc.toString());
        } else {
          onRevert?.();
        }
        return false;
      },
    }),
  ];
};
