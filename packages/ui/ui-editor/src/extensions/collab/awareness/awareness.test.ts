//
// Copyright 2026 DXOS.org
//

import { EditorSelection, EditorState, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, onTestFinished, test } from 'vitest';

import { Event } from '@dxos/async';

import { type AwarenessProvider, type AwarenessUpdateOptions, awareness } from './awareness.ts';

describe('awareness', () => {
  test('a remote edit that shifts the caret is not a move', ({ expect }) => {
    const { view, moves } = createView();
    view.dispatch({ selection: EditorSelection.cursor(1) });
    view.dispatch({ changes: { from: 0, insert: 'x' }, annotations: Transaction.remote.of(true) });
    expect(moves).toEqual([true, false]);
  });

  test('returning focus is a move', async ({ expect }) => {
    const { view, moves } = createView();
    view.contentDOM.blur();
    await expect.poll(() => moves).toEqual([true]);
    view.focus();
    await expect.poll(() => moves).toEqual([true, true]);
  });

  test('a local selection change without a user event is a move', ({ expect }) => {
    const { view, moves } = createView();
    // As outliner navigation and typeahead dispatch.
    view.dispatch({ selection: EditorSelection.cursor(2) });
    expect(moves).toEqual([true]);
  });

  test('a local edit that leaves the caret in place is a move', ({ expect }) => {
    const { view, moves } = createView();
    view.dispatch({ selection: EditorSelection.cursor(1) });
    view.dispatch({ changes: { from: 1, to: 2 }, userEvent: 'delete.forward' });
    expect(moves).toEqual([true, true]);
  });
});

const createView = () => {
  const moves: (boolean | undefined)[] = [];
  const provider: AwarenessProvider = {
    remoteStateChange: new Event(),
    open: () => {},
    close: () => {},
    getRemoteStates: () => [],
    update: (_position, options?: AwarenessUpdateOptions) => {
      moves.push(options?.moved);
    },
  };
  const view = new EditorView({
    state: EditorState.create({ doc: 'abc', extensions: [awareness(provider)] }),
    parent: document.body,
  });
  onTestFinished(() => view.destroy());
  view.focus();
  view.dispatch({ selection: EditorSelection.cursor(0), userEvent: 'select' });
  moves.length = 0;
  return { view, moves };
};
