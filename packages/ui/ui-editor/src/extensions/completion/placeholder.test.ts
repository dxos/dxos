//
// Copyright 2026 DXOS.org
//

import { EditorSelection, EditorState, type Extension } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { describe, onTestFinished, test } from 'vitest';

import { emptyPlaceholder, placeholder } from './placeholder.ts';

const createView = (extensions: Extension): EditorView => {
  const view = new EditorView({ state: EditorState.create({ extensions }), parent: document.body });
  onTestFinished(() => view.destroy());
  return view;
};

const placeholders = (view: EditorView): string[] =>
  [...view.contentDOM.querySelectorAll('.cm-placeholder')].map((el) => el.textContent ?? '');

class CaretWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.className = 'test-caret';
    return span;
  }
}

describe('placeholder', () => {
  test('the empty-document placeholder gives way to a hint', async ({ expect }) => {
    const view = createView([
      emptyPlaceholder('Enter text'),
      placeholder({ content: 'Press / for commands', delay: 0 }),
    ]);
    expect(placeholders(view)).to.deep.eq(['Enter text']);
    expect(view.contentDOM.getAttribute('aria-placeholder')).to.eq('Enter text');

    view.dispatch({ selection: EditorSelection.cursor(0) });
    await expect.poll(() => placeholders(view)).to.deep.eq(['Press / for commands']);
    expect(view.contentDOM.getAttribute('aria-placeholder')).to.eq('Press / for commands');

    view.dispatch({ changes: { from: 0, insert: 'a' } });
    expect(placeholders(view)).to.deep.eq([]);
  });

  test('a widget at the placeholder position draws before it', ({ expect }) => {
    const view = createView([
      emptyPlaceholder('Enter text'),
      EditorView.decorations.of(Decoration.set(Decoration.widget({ widget: new CaretWidget(), side: 1 }).range(0))),
    ]);
    const caret = view.contentDOM.querySelector('.test-caret');
    const text = view.contentDOM.querySelector('.cm-placeholder');
    expect(caret && text && caret.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).to.be.ok;
  });
});
