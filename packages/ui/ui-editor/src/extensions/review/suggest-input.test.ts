//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { EditorSelection, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { afterEach, describe, test } from 'vitest';

import { type RoutedChange, suggestInput } from './suggest-input';

const DOC = 'alpha bravo charlie';

describe('suggestInput', () => {
  let view: EditorView | undefined;
  afterEach(() => {
    view?.destroy();
    view = undefined;
  });

  const setup = () => {
    const routed: RoutedChange[][] = [];
    view = new EditorView({ doc: DOC, extensions: [suggestInput({ onChange: (changes) => routed.push(changes) })] });
    return { view, routed };
  };

  /** Dispatch as the DOM input handler would: a user-annotated change at the current selection. */
  const type = (view: EditorView, at: number, text: string) => {
    view.dispatch({
      changes: { from: at, insert: text },
      selection: EditorSelection.cursor(at + text.length),
      annotations: Transaction.userEvent.of('input.type'),
    });
  };

  test('a typed edit is routed, not applied — the document is main and stays main', ({ expect }) => {
    const { view, routed } = setup();
    type(view, 5, 'X');
    expect(view.state.doc.toString()).toBe(DOC);
    expect(routed).toEqual([[{ from: 5, to: 5, insert: 'X' }]]);
  });

  test('a user deletion is routed with its range', ({ expect }) => {
    const { view, routed } = setup();
    view.dispatch({
      changes: { from: 6, to: 11 },
      annotations: Transaction.userEvent.of('delete.backward'),
    });
    expect(view.state.doc.toString()).toBe(DOC);
    expect(routed).toEqual([[{ from: 6, to: 11, insert: '' }]]);
  });

  test('remote/programmatic changes pass through untouched', ({ expect }) => {
    const { view, routed } = setup();
    // No userEvent annotation — the shape of a sync update or Accept's splice.
    view.dispatch({ changes: { from: 0, insert: 'sync: ' } });
    expect(view.state.doc.toString()).toBe(`sync: ${DOC}`);
    expect(routed).toEqual([]);
  });

  test('selection and caret movement survive a routed edit', ({ expect }) => {
    const { view } = setup();
    view.dispatch({ selection: EditorSelection.cursor(5) });
    type(view, 5, 'X');
    // The caret stays where the user put it (the overlay will render the routed text there).
    expect(view.state.selection.main.head).toBe(5);
    expect(view.state.selection.main.empty).toBe(true);
  });

  test('pure selection changes are untouched', ({ expect }) => {
    const { view, routed } = setup();
    view.dispatch({ selection: EditorSelection.cursor(3), annotations: Transaction.userEvent.of('select') });
    expect(view.state.selection.main.head).toBe(3);
    expect(routed).toEqual([]);
  });

  test('IME composition applies locally, then is excised and routed at composition end', async ({ expect }) => {
    const { view, routed } = setup();
    // Mid-composition updates must reach the document synchronously or the IME breaks.
    view.dispatch({ changes: { from: 0, insert: 'あ' }, annotations: Transaction.userEvent.of('input.type.compose') });
    expect(view.state.doc.toString()).toBe(`あ${DOC}`);

    // Composition end (immediate in this headless harness — `view.composing` is only true while a real
    // IME session is open): the composed run is excised from main and routed as one edit. A live
    // multi-update session is exercised in the browser-level play per the verification policy.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(view.state.doc.toString()).toBe(DOC);
    expect(routed).toEqual([[{ from: 0, to: 0, insert: 'あ' }]]);
  });
});
