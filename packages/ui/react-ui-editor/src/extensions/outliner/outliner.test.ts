//
// Copyright 2025 DXOS.org
//

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { str } from '../../util';
import { createMarkdownExtensions } from '../markdown';

import { indentItemLess, indentItemMore, moveItemDown, moveItemUp } from './commands';
import { listItemToString, outlinerTree, treeFacet } from './tree';

const lines = [
  '- [ ] 1',
  '- [ ] 2',
  '  - [ ] 2.1',
  '  - [ ] 2.2',
  '    - 2.2.1',
  '    - 2.2.2',
  '    - 2.2.3',
  '  - [ ] 2.3',
  '- [ ] 3',
];

const getPos = (line: number) => {
  return lines.slice(0, line).reduce((acc, line) => acc + line.length + 1, 0);
};

const extensions = [createMarkdownExtensions(), outlinerTree()];

// TODO(burdon): Flaky.
describe.runIf(!process.env.CI)('outliner', () => {
  const state = EditorState.create({ doc: str(...lines), extensions });

  test('sanity', ({ expect }) => {
    const tree = state.facet(treeFacet);
    let i = 0;
    tree.traverse((item, level) => {
      const pos = getPos(i++);
      expect(item.lineRange.from).toBe(pos);
      console.log(listItemToString(item, level), pos);
    });
  });

  test('indent', ({ expect }) => {
    const view = new EditorView({ state });
    const pos = getPos(1);

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
    const pos = getPos(2);

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
  });
});
