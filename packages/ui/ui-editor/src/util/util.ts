//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

export const insertAtCursor = (view: EditorView, from: number, insert: string) => {
  view.dispatch({
    changes: { from, to: from, insert },
    selection: { anchor: from + insert.length, head: from + insert.length },
  });
};

/**
 * If the cursor is at the start of a line, insert the text at the cursor.
 * Otherwise, insert the text on a new line.
 */
export const insertAtLineStart = (view: EditorView, from: number, insert: string) => {
  const line = view.state.doc.lineAt(from);
  if (line.from === from) {
    insertAtCursor(view, from, insert);
  } else {
    insert = '\n' + insert;
    view.dispatch({
      changes: { from: line.to, to: line.to, insert },
      selection: { anchor: line.to + insert.length, head: line.to + insert.length },
    });
  }
};
