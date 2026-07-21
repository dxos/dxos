//
// Copyright 2026 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { focus } from '../../state/focus';
import { image } from './image';

const createView = (doc: string, extensions: any[]) => {
  const parent = document.createElement('div');
  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [markdown({ base: markdownLanguage }), focus, ...extensions],
    }),
    parent,
  });
};

const countImageElements = (view: EditorView): number => view.dom.querySelectorAll('img.cm-image').length;

describe('image extension', () => {
  test('renders <img> for an http image link by default', ({ expect }) => {
    const view = createView('![](http://example.com/x.png)', [image(), EditorView.editable.of(false)]);
    expect(countImageElements(view)).toBeGreaterThan(0);
    view.destroy();
  });

  test('honors skip callback to suppress remote image rendering', ({ expect }) => {
    const skip = ({ url }: { name: 'Image'; url: string }) => /^https?:\/\//.test(url);
    const view = createView('![alt](http://example.com/x.png)', [image({ skip }), EditorView.editable.of(false)]);
    expect(countImageElements(view)).toBe(0);
    view.destroy();
  });

  test('skip can be selective: blocks http(s) while still rendering file: URLs', ({ expect }) => {
    const skip = ({ url }: { name: 'Image'; url: string }) => /^https?:\/\//.test(url);

    const blockedView = createView('![alt](https://other.example.com/y.png)', [
      image({ skip }),
      EditorView.editable.of(false),
    ]);
    expect(countImageElements(blockedView)).toBe(0);
    blockedView.destroy();

    const allowedView = createView('![alt](file:///tmp/z.png)', [image({ skip }), EditorView.editable.of(false)]);
    expect(countImageElements(allowedView)).toBeGreaterThan(0);
    allowedView.destroy();
  });
});
