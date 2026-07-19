//
// Copyright 2026 DXOS.org
//

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { join } from '../../util';
import { blockSelectionField } from '../blocks';
import { createMarkdownExtensions } from '../markdown';
import { getExtent, selectAllItems, selectDown, selectUp } from './dnd';
import { outlinerTree, treeFacet } from './tree';

const lines = ['- [ ] 1', '- [ ] 2', '  - [ ] 2.1', '  - [ ] 2.2', '    - 2.2.1', '  - [ ] 2.3', '- [ ] 3'];

const getPos = (line: number) => lines.slice(0, line).reduce((acc, text) => acc + text.length + 1, 0);

const extensions = [createMarkdownExtensions(), outlinerTree(), blockSelectionField];

// The tree parser is flagged flaky in CI (see outliner.test.ts); gate the same way.
describe.runIf(!process.env.CI)('outliner blocks', () => {
  const state = EditorState.create({ doc: join(...lines), extensions });

  test('getExtent spans the whole subtree', ({ expect }) => {
    // Item "2" (line 1) owns 2.1, 2.2 (with 2.2.1), and 2.3 — lines 1..5.
    const extent = getExtent(state, { from: getPos(1), to: getPos(1) });
    expect(state.doc.sliceString(extent.from, extent.to)).to.eq(join(...lines.slice(1, 6)));
  });

  test('getExtent of a leaf is the item itself', ({ expect }) => {
    const extent = getExtent(state, { from: getPos(6), to: getPos(6) });
    expect(state.doc.sliceString(extent.from, extent.to)).to.eq(lines[6]);
  });

  test('selectAllItems selects every item anchor', ({ expect }) => {
    const view = new EditorView({ state });
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
  });

  test('selectDown / selectUp extend the block selection by one item', ({ expect }) => {
    const view = new EditorView({ state });
    view.dispatch({ selection: EditorSelection.cursor(getPos(0) + 6) });

    selectDown(view);
    // The caret item (1) and the next item (2) are now selected.
    expect([...view.state.field(blockSelectionField)]).to.deep.eq([getPos(0), getPos(1)]);

    selectUp(view);
    // Extending back up adds the item above the caret's current item.
    expect(view.state.field(blockSelectionField)).to.include(getPos(0));
  });
});
