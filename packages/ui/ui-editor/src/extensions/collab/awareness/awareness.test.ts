//
// Copyright 2026 DXOS.org
//

import { EditorSelection, EditorState, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import * as Schema from 'effect/Schema';
import { describe, onTestFinished, test } from 'vitest';

import { Event } from '@dxos/async';
import { DXN, Obj, Type } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';

import { cursorConverter } from '../automerge/cursor.ts';
import { automerge } from '../automerge/index.ts';
import { type AwarenessPosition, type AwarenessProvider, type AwarenessUpdateOptions, awareness } from './awareness.ts';

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

  test('a caret typed at the end of a line is published at that line end', ({ expect }) => {
    const obj = Obj.make(TestType, { text: 'ab\ncd' });
    const accessor = Doc.createAccessor(obj, ['text']);
    const positions: (AwarenessPosition | undefined)[] = [];
    const view = new EditorView({
      state: EditorState.create({
        doc: 'ab\ncd',
        extensions: [awareness(createProvider((position) => positions.push(position))), automerge(accessor)],
      }),
      parent: document.body,
    });
    onTestFinished(() => view.destroy());
    view.focus();
    view.dispatch({ selection: EditorSelection.cursor(2), userEvent: 'select' });

    view.dispatch({ changes: { from: 2, insert: 'x' }, selection: EditorSelection.cursor(3), userEvent: 'input.type' });
    expect(Doc.getValue(accessor)).toBe('abx\ncd');
    expect(cursorConverter(accessor).fromCursor(positions.at(-1)?.head ?? '')).toBe(3);
  });
});

const TestType = Schema.Struct({ text: Schema.String }).pipe(
  Type.makeObject(DXN.make('com.example.test.awareness', '0.1.0')),
);

const createProvider = (
  onUpdate: (position: AwarenessPosition | undefined, options?: AwarenessUpdateOptions) => void,
): AwarenessProvider => ({
  remoteStateChange: new Event(),
  open: () => {},
  close: () => {},
  getRemoteStates: () => [],
  update: onUpdate,
});

const createView = () => {
  const moves: (boolean | undefined)[] = [];
  const provider = createProvider((_position, options) => moves.push(options?.moved));
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
