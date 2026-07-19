//
// Copyright 2026 DXOS.org
//

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { join } from '../../../util';
import { createMarkdownExtensions } from '../../language/markdown';
import { blockSelectionField } from '../blocks';
import { getExtent, moveBlocks, replaceBlocks, selectAllItems, selectDown, selectUp } from './dnd';
import { outlinerTree, treeFacet } from './tree';

const LINES = ['- [ ] 1', '- [ ] 2', '  - [ ] 2.1', '  - [ ] 2.2', '    - 2.2.1', '  - [ ] 2.3', '- [ ] 3'];
const DOC = join(...LINES);
const extensions = [createMarkdownExtensions(), outlinerTree(), blockSelectionField];

const getPos = (line: number) => LINES.slice(0, line).reduce((acc, text) => acc + text.length + 1, 0);
const makeState = () => EditorState.create({ doc: DOC, extensions });

// Runs `fn` against a fresh view (destroyed after, so pending measures can't leak between cases — the
// former flakiness that had this suite gated out of CI) and returns the resulting document.
const withView = (fn: (view: EditorView) => void): string => {
  const view = new EditorView({ state: makeState() });
  try {
    fn(view);
    return view.state.doc.toString();
  } finally {
    view.destroy();
  }
};

describe('outliner blocks', () => {
  test('getExtent spans the whole subtree', ({ expect }) => {
    // Item "2" (line 1) owns 2.1, 2.2 (with 2.2.1), and 2.3 — lines 1..5.
    const extent = getExtent(makeState(), { from: getPos(1), to: getPos(1) });
    expect(makeState().doc.sliceString(extent.from, extent.to)).to.eq(join(...LINES.slice(1, 6)));
  });

  test('getExtent of a leaf is the item itself', ({ expect }) => {
    const extent = getExtent(makeState(), { from: getPos(6), to: getPos(6) });
    expect(makeState().doc.sliceString(extent.from, extent.to)).to.eq(LINES[6]);
  });

  test('moving a nested item to the top level re-roots its subtree indentation', ({ expect }) => {
    // Drag "2.2" (with 2.2.1) from level 1 to the slot before "3" (top level).
    expect(withView((view) => moveBlocks(view, [3], 6))).to.eq(
      join('- [ ] 1', '- [ ] 2', '  - [ ] 2.1', '  - [ ] 2.3', '- [ ] 2.2', '  - 2.2.1', '- [ ] 3'),
    );
  });

  test('deleting the last item leaves no orphaned separator', ({ expect }) => {
    expect(withView((view) => replaceBlocks(view, [6], null))).to.eq(
      join('- [ ] 1', '- [ ] 2', '  - [ ] 2.1', '  - [ ] 2.2', '    - 2.2.1', '  - [ ] 2.3'),
    );
  });

  test('deleting an interior item removes it and its separator, promoting its children', ({ expect }) => {
    // "2" owns 2.1/2.2/2.3; deleting its own line leaves the descendants in place.
    expect(withView((view) => replaceBlocks(view, [1], null))).to.eq(
      join('- [ ] 1', '  - [ ] 2.1', '  - [ ] 2.2', '    - 2.2.1', '  - [ ] 2.3', '- [ ] 3'),
    );
  });

  test('selectAllItems selects every item anchor', ({ expect }) => {
    const view = new EditorView({ state: makeState() });
    try {
      selectAllItems(view);
      const tree = view.state.facet(treeFacet);
      const expected: number[] = [];
      tree.traverse((item) => {
        // A block-body callback (no return) so `traverse` doesn't stop early on a truthy value.
        expected.push(item.lineRange.from);
      });
      expect([...view.state.field(blockSelectionField)]).to.deep.eq(expected.sort((a, b) => a - b));

      // Toggles off when everything is already selected.
      selectAllItems(view);
      expect(view.state.field(blockSelectionField)).to.have.length(0);
    } finally {
      view.destroy();
    }
  });

  test('selectDown / selectUp extend the block selection by one item', ({ expect }) => {
    const view = new EditorView({ state: makeState() });
    try {
      view.dispatch({ selection: EditorSelection.cursor(getPos(0) + 6) });

      selectDown(view);
      // The caret item (1) and the next item (2) are now selected.
      expect([...view.state.field(blockSelectionField)]).to.deep.eq([getPos(0), getPos(1)]);

      selectUp(view);
      // Extending back up adds the item above the caret's current item.
      expect(view.state.field(blockSelectionField)).to.include(getPos(0));
    } finally {
      view.destroy();
    }
  });
});
