//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { createMarkdownExtensions } from './bundle';
import { decorateMarkdown } from './decorate';

/** The GFM parser produces the nodes; only `decorateMarkdown` turns one into an anchor. */
const createView = (doc: string) => {
  const parent = document.createElement('div');
  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [createMarkdownExtensions(), decorateMarkdown(), EditorView.editable.of(false)],
    }),
    parent,
  });
};

const anchors = (view: EditorView): { text: string; href: string }[] =>
  Array.from(view.dom.querySelectorAll('a.cm-link')).map((anchor) => ({
    text: anchor.textContent ?? '',
    href: anchor.getAttribute('href') ?? '',
  }));

describe('autolinks', () => {
  test('a bare URL renders as an anchor', ({ expect }) => {
    const view = createView('See https://example.com/path?a=1 for details.');
    expect(anchors(view)).toEqual([{ text: 'https://example.com/path?a=1', href: 'https://example.com/path?a=1' }]);
    view.destroy();
  });

  test('the angle-bracket form renders as an anchor without its brackets', ({ expect }) => {
    const view = createView('Mail <https://example.com/y>.');
    expect(anchors(view)).toEqual([{ text: 'https://example.com/y', href: 'https://example.com/y' }]);
    view.destroy();
  });

  test('a bracketed link still renders its label, not its target', ({ expect }) => {
    const view = createView('[Docs](https://dxos.org)');
    expect(anchors(view)).toEqual([{ text: 'Docs', href: 'https://dxos.org' }]);
    view.destroy();
  });

  test('every form in one document', ({ expect }) => {
    const view = createView('https://a.example.com and [b](https://b.example.com) and <https://c.example.com>');
    expect(anchors(view).map(({ href }) => href)).toEqual([
      'https://a.example.com',
      'https://b.example.com',
      'https://c.example.com',
    ]);
    view.destroy();
  });

  test('skip suppresses an autolink the host renders itself', ({ expect }) => {
    const parent = document.createElement('div');
    const view = new EditorView({
      state: EditorState.create({
        doc: 'https://example.com/x',
        extensions: [
          createMarkdownExtensions(),
          decorateMarkdown({ skip: ({ url }) => url.startsWith('https://example.com') }),
          EditorView.editable.of(false),
        ],
      }),
      parent,
    });
    expect(anchors(view)).toEqual([]);
    view.destroy();
  });
});
