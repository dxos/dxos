//
// Copyright 2025 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { type ChangeSpec, EditorSelection, EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { editor } from './editor';
import { outlinerTree, treeFacet } from './tree';

const extensions = [markdown({ base: markdownLanguage }), outlinerTree(), editor()];

// Two items: item 1 content [6,7]='A'; line 2 starts at 8, item 2 marker [8,14), content [14,15]='B'.
const DOC = '- [ ] A\n- [ ] B';

// Resulting caret after moving it to `pos` (the transaction filter snaps out-of-range positions).
const snap = (doc: string, pos: number): number =>
  EditorState.create({ doc, extensions }).update({ selection: EditorSelection.cursor(pos) }).state.selection.main.from;

// Resulting caret after moving from `prev` to `next` (the filter uses the delta to pick a direction).
const snapFrom = (doc: string, prev: number, next: number): number => {
  const state = EditorState.create({ doc, extensions }).update({ selection: EditorSelection.cursor(prev) }).state;
  return state.update({ selection: EditorSelection.cursor(next) }).state.selection.main.from;
};

// Resulting document after applying `spec` with the caret at `cursor`.
const applyChange = (doc: string, cursor: number, spec: ChangeSpec): string => {
  const state = EditorState.create({ doc, extensions }).update({ selection: EditorSelection.cursor(cursor) }).state;
  return state.update({ changes: spec }).state.doc.toString();
};

describe('editor', () => {
  test('an empty document still has a tree', ({ expect }) => {
    const state = EditorState.create({ extensions });
    expect(state.facet(treeFacet)).to.exist;
  });

  describe('selection guard', () => {
    test('snaps a caret placed inside the marker to the content start', ({ expect }) => {
      for (const pos of [0, 1, 3, 5]) {
        expect(snap('- [ ] ', pos)).to.eq(6);
      }
      // A caret already at the content start is left alone.
      expect(snap('- [ ] ', 6)).to.eq(6);
    });

    test('snaps within a later item too', ({ expect }) => {
      expect(snap(DOC, 9)).to.eq(14); // Inside item 2's marker.
      expect(snap(DOC, 10)).to.eq(14);
      expect(snap(DOC, 14)).to.eq(14); // Content start is valid.
    });

    test('moving down into an item lands at its content start', ({ expect }) => {
      expect(snapFrom(DOC, 7, 10)).to.eq(14);
    });

    test('moving up into an item lands at its content end', ({ expect }) => {
      expect(snapFrom(DOC, 14, 4)).to.eq(7);
    });

    test('moving left across the marker goes to the previous line end', ({ expect }) => {
      expect(snapFrom(DOC, 14, 13)).to.eq(7);
    });
  });

  describe('change validation', () => {
    test('allows deleting a whole item line', ({ expect }) => {
      expect(applyChange(DOC, 0, { from: 0, to: 8 })).to.eq('- [ ] B');
    });

    test('allows typing into the content', ({ expect }) => {
      expect(applyChange('- [ ] ', 6, { from: 6, to: 6, insert: 'X' })).to.eq('- [ ] X');
    });

    test('allows editing within the content', ({ expect }) => {
      expect(applyChange('- [ ] A', 7, { from: 6, to: 7 })).to.eq('- [ ] ');
    });
  });

  // Task-marker atomicity (backspace on `- [ ] ` removing the whole marker, or inserting a continuation
  // indent) is enforced by the markdown extension's keymap, which produces the specific change shapes the
  // filter reacts to — not by raw `changes`. Covering it needs the full keymap dispatched through a view.
  test.todo('task-marker atomicity (needs the markdown keymap, not a raw change)');
});
