//
// Copyright 2026 DXOS.org
//

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { join } from '../../../util';
import { createMarkdownExtensions } from '../../language/markdown';
import { blockSelectionField } from '../blocks';
import { getDropIndent, getExtent, moveBlocks, replaceBlocks, selectAllItems, selectDown, selectUp } from './dnd';
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

// See DESIGN "Drag reindent — drop level rules". The live `getDropIndent` (pointer-driven) is verified in
// storybook; here we lock in the drop application: `moveBlocks(view, sources, dropIndex, indent)` re-roots
// the moved subtree to the given level. Doc:  - A / (  - B) / (  - C) / - D.
describe('outliner drag reindent', () => {
  const BRANCH = ['- A', '  - B', '  - C', '- D'];
  const branchView = (fn: (view: EditorView) => void): string => {
    const view = new EditorView({
      state: EditorState.create({ doc: join(...BRANCH), extensions }),
    });
    try {
      fn(view);
      return view.state.doc.toString();
    } finally {
      view.destroy();
    }
  };

  test('(i) default — B dropped before D keeps its level (a child of A)', ({ expect }) => {
    // indent 2 = a sibling of C = a child of A.
    expect(branchView((view) => moveBlocks(view, [1], 3, 2))).to.eq(join('- A', '  - C', '  - B', '- D'));
  });

  test('(ii) outdent — B dropped before D at level 0 becomes a sibling of A', ({ expect }) => {
    expect(branchView((view) => moveBlocks(view, [1], 3, 0))).to.eq(join('- A', '  - C', '- B', '- D'));
  });

  test('getDropIndent defaults to (i) — keeps the item in its branch, no preview shift', ({ expect }) => {
    const view = new EditorView({ state: EditorState.create({ doc: join(...BRANCH), extensions }) });
    try {
      // Drop B (idx 1) before D (idx 3) with the pointer well above D's row (not over it): stays a child
      // of A (indent 2, its own level), so the preview is not shifted.
      expect(getDropIndent(view, [1], 3, -1000)).to.deep.eq({ indent: 2, offset: 0 });
      // Multi-item drags do not single-re-root.
      expect(getDropIndent(view, [1, 2], 3, -1000)).to.eq(null);
    } finally {
      view.destroy();
    }
  });
});
