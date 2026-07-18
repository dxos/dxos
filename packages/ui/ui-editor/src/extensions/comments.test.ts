//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { comments, createComment } from './comments';

describe('createComment', () => {
  test('collapses the selection to its start after creating a comment', ({ expect }) => {
    const created: { cursor: string; from: number }[] = [];
    const view = new EditorView({
      doc: 'The quick brown fox jumps over the lazy dog.',
      extensions: [comments({ id: 'test', onCreate: ({ cursor, from }) => created.push({ cursor, from }) })],
    });

    // Select "quick".
    view.dispatch({ selection: { anchor: 4, head: 9 } });
    const result = createComment(view);

    expect(result).to.eq(true);
    expect(created).to.have.length(1);
    // The text selection is collapsed to the start of the commented range.
    expect(view.state.selection.main.empty).to.eq(true);
    expect(view.state.selection.main.head).to.eq(4);

    view.destroy();
  });

  test('is a no-op without a selection range', ({ expect }) => {
    const view = new EditorView({
      doc: 'The quick brown fox.',
      extensions: [comments({ id: 'test', onCreate: () => {} })],
    });

    view.dispatch({ selection: { anchor: 4 } });
    expect(createComment(view)).to.eq(false);

    view.destroy();
  });
});
