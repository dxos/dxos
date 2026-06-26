//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import {
  appendPendingText,
  cancelPending,
  commitPending,
  pendingText,
  pendingTextState,
  setPendingAnchor,
  setPendingInterim,
} from './pending-text';

const createView = (doc: string): EditorView =>
  new EditorView({ state: EditorState.create({ doc, extensions: [pendingText()] }) });

describe('pendingText extension', () => {
  test('append and interim accumulate without changing the document', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ effects: setPendingAnchor.of(6) });
    view.dispatch({ effects: appendPendingText.of('world') });
    view.dispatch({ effects: setPendingInterim.of(' and') });
    expect(view.state.field(pendingTextState)).toEqual({ anchor: 6, final: 'world', interim: ' and' });
    expect(view.state.doc.toString()).toBe('hello ');
    view.destroy();
  });

  test('appending finalized text clears the interim tail', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ effects: setPendingAnchor.of(6) });
    view.dispatch({ effects: setPendingInterim.of('wor') });
    view.dispatch({ effects: appendPendingText.of('world') });
    expect(view.state.field(pendingTextState)).toEqual({ anchor: 6, final: 'world', interim: '' });
    view.destroy();
  });

  test('commit inserts the finalized text at the anchor and clears state', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ effects: setPendingAnchor.of(6) });
    view.dispatch({ effects: appendPendingText.of('world') });
    view.dispatch({ effects: setPendingInterim.of(' dropped') });
    expect(commitPending(view)).toBe(true);
    expect(view.state.doc.toString()).toBe('hello world');
    expect(view.state.field(pendingTextState)).toBeNull();
    view.destroy();
  });

  test('cancel discards pending text and leaves the document unchanged', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ effects: setPendingAnchor.of(6) });
    view.dispatch({ effects: appendPendingText.of('world') });
    expect(cancelPending(view)).toBe(true);
    expect(view.state.doc.toString()).toBe('hello ');
    expect(view.state.field(pendingTextState)).toBeNull();
    view.destroy();
  });

  test('commit and cancel are no-ops when there is no pending text', ({ expect }) => {
    const view = createView('hello ');
    expect(commitPending(view)).toBe(false);
    expect(cancelPending(view)).toBe(false);
    view.destroy();
  });

  test('anchor survives an edit before the anchor', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ effects: setPendingAnchor.of(6) });
    view.dispatch({ effects: appendPendingText.of('world') });
    view.dispatch({ changes: { from: 0, insert: 'X' } });
    expect(view.state.field(pendingTextState)?.anchor).toBe(7);
    expect(commitPending(view)).toBe(true);
    expect(view.state.doc.toString()).toBe('Xhello world');
    view.destroy();
  });

  test('the first text effect without an explicit anchor uses the selection head', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ selection: { anchor: 6 } });
    view.dispatch({ effects: appendPendingText.of('world') });
    expect(view.state.field(pendingTextState)?.anchor).toBe(6);
    view.destroy();
  });
});
