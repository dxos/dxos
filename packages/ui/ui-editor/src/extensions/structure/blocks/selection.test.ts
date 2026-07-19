//
// Copyright 2026 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { findBlocks } from './blocks';
import { blockSelectionField, getSelectedBlocks, setBlockSelection, toggleBlockSelection } from './selection';

const extensions = [markdown({ base: markdownLanguage }), blockSelectionField];
const create = (doc: string) => EditorState.create({ doc, extensions });

describe('blockSelectionField', () => {
  test('set replaces and toggle adds/removes, kept sorted', ({ expect }) => {
    let state = create('A\n\nB\n\nC'); // anchors: A@0, B@3, C@6
    state = state.update({ effects: setBlockSelection.of([6, 0]) }).state;
    expect([...state.field(blockSelectionField)]).to.deep.eq([0, 6]);
    state = state.update({ effects: toggleBlockSelection.of(0) }).state;
    expect([...state.field(blockSelectionField)]).to.deep.eq([6]);
    state = state.update({ effects: toggleBlockSelection.of(3) }).state;
    expect([...state.field(blockSelectionField)]).to.deep.eq([3, 6]);
  });

  test('anchors map through edits', ({ expect }) => {
    let state = create('A\n\nB\n\nC');
    state = state.update({ effects: setBlockSelection.of([3, 6]) }).state;
    // Insert two characters at the start; anchors shift by two.
    state = state.update({ changes: { from: 0, insert: 'XY' } }).state;
    expect([...state.field(blockSelectionField)]).to.deep.eq([5, 8]);
  });

  test('a caret move keeps the selection (extendable via keyboard)', ({ expect }) => {
    let state = create('A\n\nB');
    state = state.update({ effects: setBlockSelection.of([0]) }).state;
    state = state.update({ selection: { anchor: 3 } }).state;
    expect([...state.field(blockSelectionField)]).to.deep.eq([0]);
  });

  test('getSelectedBlocks resolves anchors to blocks in order', ({ expect }) => {
    let state = create('A\n\nB\n\nC');
    state = state.update({ effects: setBlockSelection.of([6, 3]) }).state;
    const selected = getSelectedBlocks(state, findBlocks);
    expect(selected.map((entry) => entry.index)).to.deep.eq([1, 2]);
    expect(state.doc.sliceString(selected[0].block.from, selected[0].block.to)).to.eq('B');
  });

  test('getSelectedBlocks drops stale anchors', ({ expect }) => {
    let state = create('A\n\nB\n\nC');
    // Anchor 4 is not a block start.
    state = state.update({ effects: setBlockSelection.of([0, 4]) }).state;
    const selected = getSelectedBlocks(state, findBlocks);
    expect(selected.map((entry) => entry.index)).to.deep.eq([0]);
  });
});
