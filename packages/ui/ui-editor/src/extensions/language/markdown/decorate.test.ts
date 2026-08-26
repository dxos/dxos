//
// Copyright 2026 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { afterEach, describe, test } from 'vitest';

import { focus } from '../../state/focus';
import { decorateMarkdown } from './decorate';

describe('decorateMarkdown links', () => {
  // Held by the suite so a failed assertion still releases the view.
  let view: EditorView | undefined;
  afterEach(() => {
    view?.destroy();
    view = undefined;
  });

  test('decorates a markdown link', ({ expect }) => {
    view = createView('see [the PR](https://github.com/dxos/dxos/pull/12766)');
    expect(links(view)).toEqual([{ text: 'the PR', href: 'https://github.com/dxos/dxos/pull/12766' }]);
  });

  test('decorates a bare URL', ({ expect }) => {
    view = createView('PR is open — https://github.com/dxos/dxos/pull/12766');
    expect(links(view)).toEqual([
      { text: 'https://github.com/dxos/dxos/pull/12766', href: 'https://github.com/dxos/dxos/pull/12766' },
    ]);
  });

  test('decorates an angle-bracket autolink and hides its brackets', ({ expect }) => {
    view = createView('<https://example.com/a>');
    expect(links(view)).toEqual([{ text: 'https://example.com/a', href: 'https://example.com/a' }]);
    expect(view.dom.textContent).toBe('https://example.com/a');
  });

  test('gives a schemeless host and an email a usable href', ({ expect }) => {
    view = createView('www.example.com and hello@example.com');
    expect(links(view)).toEqual([
      { text: 'www.example.com', href: 'https://www.example.com' },
      { text: 'hello@example.com', href: 'mailto:hello@example.com' },
    ]);
  });
});

const createView = (doc: string) => {
  const parent = document.createElement('div');
  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        markdown({ base: markdownLanguage }),
        focus,
        decorateMarkdown(),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
      ],
    }),
    parent,
  });
};

const links = (view: EditorView): { text: string; href: string }[] =>
  Array.from(view.dom.querySelectorAll('a.cm-link')).map((el) => ({
    text: el.textContent ?? '',
    href: el.getAttribute('href') ?? '',
  }));
