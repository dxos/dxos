//
// Copyright 2026 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

export type InlineEditOptions = {
  /** Enter, or a blur when `commitOnBlur`. Receives the document. */
  onCommit?: (text: string) => void;
  /** Escape, or a blur otherwise. */
  onRevert?: () => void;
  /** Whether leaving the editor keeps the edit or discards it. */
  commitOnBlur?: boolean;
  /**
   * Whether `Enter` commits. False for a multi-line field, where `Enter` has to stay a newline and
   * leaving the field is the only way to commit.
   */
  submitOnEnter?: boolean;
};

/**
 * Turns an editor into an inline-edit field: `Enter` commits rather than opening a line, `Escape`
 * reverts, and leaving does whichever the host asked for. `Shift-Enter` still inserts a newline,
 * so a multi-line value stays reachable.
 *
 * The document is one field's worth of text here, not a document, which is why `Enter` is free to
 * mean something else.
 */
export const inlineEdit = ({
  onCommit,
  onRevert,
  commitOnBlur = true,
  submitOnEnter = true,
}: InlineEditOptions = {}): Extension => {
  return [
    // `submit` trims what it hands over, which would drop the leading indentation a markdown code
    // block depends on — and blur commits the document as written, so the two would disagree. Enter
    // is handled here instead, reading the document itself.
    submitOnEnter
      ? Prec.highest(
          keymap.of([
            {
              key: 'Enter',
              preventDefault: true,
              run: (view) => {
                onCommit?.(view.state.doc.toString());
                return true;
              },
            },
            {
              key: 'Shift-Enter',
              preventDefault: true,
              run: (view) => {
                view.dispatch(view.state.replaceSelection('\n'));
                return true;
              },
            },
          ]),
        )
      : [],
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
