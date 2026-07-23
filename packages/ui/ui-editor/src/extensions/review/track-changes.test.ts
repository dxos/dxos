//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { history, undo } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

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

  test('the phantom restore control re-instates that specific deletion (out of edit order)', ({ expect }) => {
    // The branch removed the middle line "bravo\n" (a phantom). Unlike undo, the restore control targets
    // THIS deletion regardless of later edits: clicking it splices the removed text back and clears it.
    const view = mount('alpha\ncharlie');
    const restore = view.dom.querySelector<HTMLElement>('.cm-track-restore');
    expect(restore).not.toBeNull();
    restore!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(view.state.doc.toString()).toBe(MAIN);
    expect(view.dom.querySelector('.cm-track-delete')).toBeNull();
    view.destroy();
  });
});
