//
// Copyright 2026 DXOS.org
//

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { createMarkdownExtensions } from '../../language/markdown';
import { ghost, insertTaskAtLine } from './ghost';
import { outlinerTree } from './tree';

const extensions = [createMarkdownExtensions(), outlinerTree(), ghost()];

// A focused view with the caret at `cursor`, torn down by the caller.
const focused = (doc: string, cursor: number): EditorView => {
  const view = new EditorView({ state: EditorState.create({ doc, extensions }), parent: document.body });
  view.focus();
  view.dispatch({ selection: EditorSelection.cursor(cursor) });
  return view;
};

const placeholders = (view: EditorView): string[] =>
  [...view.contentDOM.querySelectorAll('.cm-placeholder')].map((el) => el.textContent ?? '');

describe('ghost', () => {
  test('an empty item shows the placeholder in its content', ({ expect }) => {
    const view = focused('- [ ] A\n- [ ] ', 14);
    try {
      expect(placeholders(view)).to.deep.eq(['Enter task']);
    } finally {
      view.destroy();
    }
  });

  test('a filled item and a blank line show no placeholder', ({ expect }) => {
    for (const [doc, cursor] of [
      ['- [ ] A', 7],
      ['- [ ] A\n\n', 9],
    ] as const) {
      const view = focused(doc, cursor);
      try {
        expect(placeholders(view), doc).to.deep.eq([]);
      } finally {
        view.destroy();
      }
    }
  });

  test('the add button turns the blank line into an empty task', ({ expect }) => {
    const view = focused('- [ ] A\n\n', 9);
    try {
      expect(insertTaskAtLine(view)).to.eq(true);
      expect(view.state.doc.toString()).to.eq('- [ ] A\n\n- [ ] ');
      expect(view.state.selection.main.head).to.eq(15);
      expect(placeholders(view)).to.deep.eq(['Enter task']);
    } finally {
      view.destroy();
    }
  });

  test('the add button does nothing on an item or a line with text', ({ expect }) => {
    for (const [doc, cursor] of [
      ['- [ ] A', 7],
      ['- [ ] A\n\nProse', 14],
    ] as const) {
      const view = focused(doc, cursor);
      try {
        expect(insertTaskAtLine(view), doc).to.eq(false);
        expect(view.state.doc.toString()).to.eq(doc);
      } finally {
        view.destroy();
      }
    }
  });
});
