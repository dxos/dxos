//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { history, undo } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { computeCharHunks } from './diff';
import { trackChanges } from './track-changes';

const MAIN = 'alpha\nbravo\ncharlie';

const mount = (doc: string, extensions = [trackChanges({ main: MAIN, colour: 'var(--dx-accent)' })]) =>
  new EditorView({ state: EditorState.create({ doc, extensions }), parent: document.body });

describe('trackChanges', () => {
  test('a multi-line (block) deletion renders a single phantom preserving the removed lines', ({ expect }) => {
    // The branch removed the middle line "bravo\n"; the phantom must show it (with its newline), not
    // collapse the block away.
    const view = mount('alpha\ncharlie');
    const phantoms = view.dom.querySelectorAll('.cm-track-delete');
    expect(phantoms).toHaveLength(1);
    // textContent carries the removed block including its line break (pre-wrap renders the break).
    expect(phantoms[0].textContent).toBe('bravo\n');
    view.destroy();
  });

  test('undo re-instates a deletion (un-delete) and clears the phantom', ({ expect }) => {
    const view = mount(MAIN, [history(), trackChanges({ main: MAIN, colour: 'var(--dx-accent)' })]);
    // Delete the "bravo\n" block on the branch → a phantom appears.
    view.dispatch({ changes: { from: 6, to: 12, insert: '' } });
    expect(view.dom.querySelector('.cm-track-delete')).not.toBeNull();
    expect(view.state.doc.toString()).toBe('alpha\ncharlie');

    // Native undo restores the deleted text (the deletion is an ordinary branch edit) and the phantom
    // disappears.
    undo(view);
    expect(view.state.doc.toString()).toBe(MAIN);
    expect(view.dom.querySelector('.cm-track-delete')).toBeNull();
    view.destroy();
  });

  test('a changed line renders a gutter change-bar in the author colour', ({ expect }) => {
    // Branch inserts " extra" on the first line → that line gets a change-bar; an unchanged line does not.
    const view = mount('alpha extra\nbravo\ncharlie');
    const bars = view.dom.querySelectorAll<HTMLElement>('.cm-change-bar');
    expect(bars.length).toBe(1);
    expect(bars[0].style.background).toBe('var(--dx-accent)');
    view.destroy();
  });

  test('a new-paragraph insertion bars only the text line, not the trailing blank line', ({ expect }) => {
    // The branch inserts a new first paragraph "intro\n\n" before "alpha"; the trailing paragraph break
    // must not tag the blank line — exactly one bar, on the inserted text line.
    const view = mount('intro\n\nalpha\nbravo\ncharlie');
    expect(view.dom.querySelectorAll('.cm-change-bar')).toHaveLength(1);
    view.destroy();
  });

  // A reader deleting a run of words must strike exactly those words: character diffing used to match
  // stray letters across the run (`t` of `it` against `t` of `two`), splitting words at both edges.
  test('deleting a run of words strikes whole words', ({ expect }) => {
    const main = 'the revision it was written on, so two people can suggest changes';
    const doc = main.replace('it was written on, so ', '');
    const hunks = computeCharHunks(main, doc);
    expect(hunks).toHaveLength(1);
    expect(main.slice(hunks[0].fromA, hunks[0].toA)).toBe('it was written on, so ');
  });

  // Selections do not respect word edges. Cutting into the words at each end fuses the survivors, and a
  // word-level hunk then reads as "delete both words, insert this fused one" — rendering a phantom of
  // both whole words plus a bogus insertion (`writte` + inserted `ngest`) instead of a plain deletion.
  test('a deletion that cuts into words at both ends strikes only what was removed', ({ expect }) => {
    const main = 'the revision it was written on, so two people can suggest changes';
    const cut = 'n on, so two people can sugge';
    const doc = main.replace(cut, '');

    const hunks = computeCharHunks(main, doc);
    expect(hunks).toHaveLength(1);
    expect(main.slice(hunks[0].fromA, hunks[0].toA)).toBe(cut);
    // Nothing is reported as inserted: the reader only deleted.
    expect(doc.slice(hunks[0].fromB, hunks[0].toB)).toBe('');
  });

  // Deleting `suggest change` from `suggest changes` leaves an `s`, and that survivor is equally the
  // tail of `changes` or the head of `suggest`. The minimal edit is ambiguous, so the strike must be
  // slid to the word boundary — otherwise it keeps the `s` of `suggest` and strikes `uggest changes`.
  test('an ambiguous deletion strikes from the word boundary', ({ expect }) => {
    const main = 'so two people can suggest changes to the same';
    const cut = 'suggest change';
    const doc = main.replace(cut, '');

    const hunks = computeCharHunks(main, doc);
    expect(hunks).toHaveLength(1);
    expect(main.slice(hunks[0].fromA, hunks[0].toA)).toBe(cut);
    expect(main[hunks[0].fromA - 1]).toBe(' ');
  });
});
