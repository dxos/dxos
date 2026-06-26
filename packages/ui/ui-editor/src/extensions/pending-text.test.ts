//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { isBusy } from './busy-state';
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

// Busy is toggled via a queued microtask, so flush before asserting.
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('pendingText extension', () => {
  test('append and interim accumulate without changing the document', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ effects: setPendingAnchor.of({ anchor: 6 }) });
    view.dispatch({ effects: appendPendingText.of('world') });
    view.dispatch({ effects: setPendingInterim.of(' and') });
    expect(view.state.field(pendingTextState)).toEqual({
      anchor: 6,
      final: 'world',
      interim: ' and',
      placeholder: undefined,
    });
    expect(view.state.doc.toString()).toBe('hello ');
    view.destroy();
  });

  test('appending finalized text clears the interim tail', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ effects: setPendingAnchor.of({ anchor: 6 }) });
    view.dispatch({ effects: setPendingInterim.of('wor') });
    view.dispatch({ effects: appendPendingText.of('world') });
    expect(view.state.field(pendingTextState)).toMatchObject({ anchor: 6, final: 'world', interim: '' });
    view.destroy();
  });

  test('commit inserts the finalized text plus a newline at the anchor and clears state', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ effects: setPendingAnchor.of({ anchor: 6 }) });
    view.dispatch({ effects: appendPendingText.of('world') });
    view.dispatch({ effects: setPendingInterim.of(' dropped') });
    expect(commitPending(view)).toBe(true);
    expect(view.state.doc.toString()).toBe('hello world\n');
    expect(view.state.field(pendingTextState)).toBeNull();
    view.destroy();
  });

  test('cancel discards pending text and leaves the document unchanged', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ effects: setPendingAnchor.of({ anchor: 6 }) });
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

  test('a placeholder-only session is held without committable text', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ effects: setPendingAnchor.of({ anchor: 6, placeholder: 'Recording…' }) });
    expect(view.state.field(pendingTextState)).toEqual({
      anchor: 6,
      final: '',
      interim: '',
      placeholder: 'Recording…',
    });
    // Nothing finalized yet, so commit is a no-op.
    expect(commitPending(view)).toBe(false);
    view.destroy();
  });

  test('anchor survives an edit before the anchor', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ effects: setPendingAnchor.of({ anchor: 6 }) });
    view.dispatch({ effects: appendPendingText.of('world') });
    view.dispatch({ changes: { from: 0, insert: 'X' } });
    expect(view.state.field(pendingTextState)?.anchor).toBe(7);
    expect(commitPending(view)).toBe(true);
    expect(view.state.doc.toString()).toBe('Xhello world\n');
    view.destroy();
  });

  test('the first text effect without an explicit anchor uses the selection head', ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ selection: { anchor: 6 } });
    view.dispatch({ effects: appendPendingText.of('world') });
    expect(view.state.field(pendingTextState)?.anchor).toBe(6);
    view.destroy();
  });

  test('flags the editor busy while a session is active and clears it on commit', async ({ expect }) => {
    const view = createView('hello ');
    view.dispatch({ effects: setPendingAnchor.of({ anchor: 6, placeholder: 'Recording…' }) });
    await flush();
    expect(isBusy(view.state)).toBe(true);

    view.dispatch({ effects: appendPendingText.of('world') });
    commitPending(view);
    await flush();
    expect(isBusy(view.state)).toBe(false);
    view.destroy();
  });
});
