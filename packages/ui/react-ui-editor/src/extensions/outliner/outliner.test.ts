//
// Copyright 2025 DXOS.org
//

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { indentItemLess, indentItemMore, moveItemDown, moveItemUp } from './outliner';
<<<<<<< HEAD
import { getListItemContent, listItemToString, outlinerTree, treeFacet } from './tree';
import { str } from '../../stories';
import { createMarkdownExtensions } from '../markdown';

const doc = str(
  //
=======
import { listItemToString, outlinerTree, treeFacet } from './tree';
import { str } from '../../stories';
import { createMarkdownExtensions } from '../markdown';

const lines = [
>>>>>>> origin/main
  '- [ ] 1',
  '- [ ] 2',
  '  - [ ] 2.1',
  '  - [ ] 2.2',
  '    - 2.2.1',
  '    - 2.2.2',
  '    - 2.2.3',
  '  - [ ] 2.3',
  '- [ ] 3',
<<<<<<< HEAD
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
=======
];

const getPos = (line: number) => {
  return lines.slice(0, line).reduce((acc, line) => acc + line.length + 1, 0);
};

describe('outliner', () => {
  const state = EditorState.create({
    doc: str(...lines),
    extensions: [createMarkdownExtensions(), outlinerTree()],
  });

  test('sanity', ({ expect }) => {
    const tree = state.facet(treeFacet);
    let i = 0;
    tree.traverse((item, level) => {
      const pos = getPos(i++);
      expect(item.lineRange.from).toBe(pos);
      console.log(listItemToString(item, level), pos);
>>>>>>> origin/main
    });
  });

  test('indent', ({ expect }) => {
    const view = new EditorView({ state });
<<<<<<< HEAD
    const pos = 8; // Line 2.
=======
    const pos = getPos(1);
>>>>>>> origin/main

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
<<<<<<< HEAD
    const pos = 18; // Line 3.
=======
    const pos = getPos(2);
>>>>>>> origin/main

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
<<<<<<< HEAD
    const tree = state.facet(treeFacet);
    const view = new EditorView({ state });

    const line1 = getListItemContent(view.state, tree.find(0)!);
    const line2 = getListItemContent(view.state, tree.find(8)!);

    view.dispatch({ selection: EditorSelection.cursor(0) });
    moveItemDown(view);

    expect(getListItemContent(view.state, tree.find(0)!)).toBe(line2);
    expect(getListItemContent(view.state, tree.find(8)!)).toBe(line1);
  });

  test('move up', ({ expect }) => {
    const tree = state.facet(treeFacet);
    const view = new EditorView({ state });

    const line1 = getListItemContent(view.state, tree.find(0)!);
    const line2 = getListItemContent(view.state, tree.find(8)!);

    view.dispatch({ selection: EditorSelection.cursor(8) });
    moveItemUp(view);

    expect(getListItemContent(view.state, tree.find(0)!)).toBe(line2);
    expect(getListItemContent(view.state, tree.find(8)!)).toBe(line1);
=======
    const view = new EditorView({ state });
    view.dispatch({ selection: EditorSelection.cursor(getPos(0)) });
    moveItemDown(view);
    expect(view.state.doc.sliceString(0, view.state.doc.length)).toBe(str(...lines.slice(1, 8), lines[0], lines[8]));
  });

  test('move up', ({ expect }) => {
    const view = new EditorView({ state });
    view.dispatch({ selection: EditorSelection.cursor(getPos(8)) });
    moveItemUp(view);
    expect(view.state.doc.sliceString(0, view.state.doc.length)).toBe(str(lines[0], lines[8], ...lines.slice(1, 8)));
>>>>>>> origin/main
  });
});
