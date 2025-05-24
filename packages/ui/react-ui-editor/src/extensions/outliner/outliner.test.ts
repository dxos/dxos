//
// Copyright 2025 DXOS.org
//

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { indentItemLess, indentItemMore, moveItemDown, moveItemUp } from './outliner';
import { getListItemContent, listItemToString, outlinerTree, treeFacet } from './tree';
import { str } from '../../stories';
import { createMarkdownExtensions } from '../markdown';

const doc = str(
  //
  '- [ ] 1',
  '- [ ] 2',
  '  - [ ] 2.1',
  '  - [ ] 2.2',
  '    - 2.2.1',
  '    - 2.2.2',
  '    - 2.2.3',
  '  - [ ] 2.3',
  '- [ ] 3',
);

describe('outliner', () => {
  const state = EditorState.create({
    doc,
    extensions: [createMarkdownExtensions(), outlinerTree()],
  });

  // TOOD(burdon): Test move up/down commands.
  test('sanity', ({ expect }) => {
    const tree = state.facet(treeFacet);
    tree.traverse((item, level) => {
      console.log(listItemToString(item, level));
    });
  });

  test('indent', ({ expect }) => {
    const view = new EditorView({ state });
    const pos = 8; // Line 2.

    {
      const tree = view.state.facet(treeFacet);
      const item = tree.find(pos);
      expect(item?.level).toBe(0);
    }

    view.dispatch({ selection: EditorSelection.cursor(pos) });
    indentItemMore(view);

    {
      const tree = view.state.facet(treeFacet);
      const item = tree.find(pos);
      expect(item?.level).toBe(1);
    }
  });

  test('unindent', ({ expect }) => {
    const view = new EditorView({ state });
    const pos = 18; // Line 3.

    {
      const tree = view.state.facet(treeFacet);
      const item = tree.find(pos);
      expect(item?.level).toBe(1);
    }

    view.dispatch({ selection: EditorSelection.cursor(pos) });
    indentItemLess(view);

    {
      const tree = view.state.facet(treeFacet);
      const item = tree.find(pos);
      expect(item?.level).toBe(0);
    }
  });

  test('move down', ({ expect }) => {
    const tree = state.facet(treeFacet);
    const view = new EditorView({ state });

    const line1 = getListItemContent(view.state, tree.find(0)!);
    const line2 = getListItemContent(view.state, tree.find(8)!);

    view.dispatch({ selection: EditorSelection.cursor(0) });
    moveItemDown(view);

    expect(getListItemContent(view.state, tree.find(0)!)).toBe(line2);
  });

  test('move up', ({ expect }) => {
    const tree = state.facet(treeFacet);
    const view = new EditorView({ state });

    const line1 = getListItemContent(view.state, tree.find(0)!);
    const line2 = getListItemContent(view.state, tree.find(8)!);

    view.dispatch({ selection: EditorSelection.cursor(8) });
    moveItemUp(view);

    // expect(getListItemContent(view.state, tree.find(0)!)).toBe(line2);
    // expect(getListItemContent(view.state, tree.find(8)!)).toBe(line1);
  });
});
