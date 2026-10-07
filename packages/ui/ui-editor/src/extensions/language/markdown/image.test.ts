//
// Copyright 2026 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { forceParsing, syntaxTree } from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { focus } from '../../state/focus.ts';
import { image } from './image.ts';

const createView = (doc: string, extensions: Extension[]) => {
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

/** Block widgets (the image extension's only kind) in the decoration sets, including those outside the rendered viewport. */
const countImageDecorations = (view: EditorView): number =>
  view.state
    .facet(EditorView.decorations)
    .map((source) => (typeof source === 'function' ? source(view) : source))
    .reduce((count, set) => {
      let images = 0;
      set.between(0, view.state.doc.length, (_from, _to, decoration) => {
        if (decoration.spec.block) {
          images++;
        }
      });
      return count + images;
    }, 0);

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

  test('renders an image the parser reaches after the editor opened, without a viewport change', ({ expect }) => {
    // Long enough that the initial parse stops well short of the image at the end.
    const doc = `${Array.from({ length: 20_000 }, (_, line) => `Line ${line} with *some* **markdown**.`).join('\n\n')}\n\n![](http://example.com/end.png)`;
    const view = createView(doc, [image(), EditorView.editable.of(false)]);
    expect(syntaxTree(view.state).length).toBeLessThan(doc.length);
    expect(countImageDecorations(view)).toBe(0);

    forceParsing(view, doc.length, 10_000);
    expect(syntaxTree(view.state).length).toBe(doc.length);
    expect(countImageDecorations(view)).toBe(1);
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
