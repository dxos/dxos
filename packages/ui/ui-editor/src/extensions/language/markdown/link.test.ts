//
// Copyright 2025 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { createMarkdownExtensions } from './bundle.ts';
import { syncLinkLabels } from './link.ts';

describe('syncLinkLabels', () => {
  test('rewrites a label that has drifted from its target', ({ expect }) => {
    const { doc, changed } = run('- [Old title](dxn:echo:@:01ABC)', () => 'New title');
    expect(changed).to.be.true;
    expect(doc).to.eq('- [New title](dxn:echo:@:01ABC)');
  });

  test('leaves the document alone when the label already matches', ({ expect }) => {
    const { doc, changed } = run('- [Same](dxn:echo:@:01ABC)', () => 'Same');
    expect(changed).to.be.false;
    expect(doc).to.eq('- [Same](dxn:echo:@:01ABC)');
  });

  test('leaves unresolved links alone', ({ expect }) => {
    const { doc, changed } = run('- [Docs](https://dxos.org)', () => undefined);
    expect(changed).to.be.false;
    expect(doc).to.eq('- [Docs](https://dxos.org)');
  });

  test('rewrites every stale link in the document', ({ expect }) => {
    const labels: Record<string, string> = { 'dxn:echo:@:01A': 'First', 'dxn:echo:@:01B': 'Second' };
    const { doc } = run('- [a](dxn:echo:@:01A)\n- [b](dxn:echo:@:01B)', (url) => labels[url]);
    expect(doc).to.eq('- [First](dxn:echo:@:01A)\n- [Second](dxn:echo:@:01B)');
  });

  test('escapes brackets and newlines in the resolved label', ({ expect }) => {
    const { doc } = run('- [a](dxn:echo:@:01A)', () => 'a [b]\n c');
    expect(doc).to.eq('- [a b c](dxn:echo:@:01A)');
  });

  test('keeps the existing label when the resolved one is empty', ({ expect }) => {
    // `[](url)` no longer parses as a Link, so the node would become invisible to later passes.
    const { doc, changed } = run('- [Old title](dxn:echo:@:01ABC)', () => '   ');
    expect(changed).to.be.false;
    expect(doc).to.eq('- [Old title](dxn:echo:@:01ABC)');
  });
});

const run = (doc: string, resolve: (url: string) => string | undefined): { doc: string; changed: boolean } => {
  const view = new EditorView({ state: EditorState.create({ doc, extensions: [createMarkdownExtensions()] }) });
  try {
    const changed = syncLinkLabels(view, resolve);
    return { doc: view.state.doc.toString(), changed };
  } finally {
    view.destroy();
  }
};
