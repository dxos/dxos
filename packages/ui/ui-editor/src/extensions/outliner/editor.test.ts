//
// Copyright 2025 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorSelection, EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { editor } from './editor';
import { outlinerTree, treeFacet } from './tree';

const extensions = [markdown({ base: markdownLanguage }), outlinerTree(), editor()];

describe('editor', () => {
  test('empty', ({ expect }) => {
    const state = EditorState.create({ extensions });
    const tree = state.facet(treeFacet);
    expect(tree).to.exist;
  });

  test('prevent moving out of range', ({ expect }) => {
    const state = EditorState.create({ doc: '- [ ] ', extensions });
    const spec = state.update({ selection: EditorSelection.cursor(1) });
    expect(spec.state.selection.ranges[0].from).to.eq(6);
  });

  test.skip('prevent deleting task marker', ({ expect }) => {
    const state = EditorState.create({ doc: '- [ ] ', extensions });
    state.update({ selection: EditorSelection.cursor(6) });
    const spec = state.update({ changes: { from: 5, to: 6 } });
    expect(spec.state.doc.toString()).to.eq('- [ ] ');
  });
});
