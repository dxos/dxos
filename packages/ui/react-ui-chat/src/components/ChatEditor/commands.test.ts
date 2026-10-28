//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import {
  acceptCompletion,
  completionStatus,
  currentCompletions,
  selectedCompletionIndex,
  setSelectedCompletion,
} from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { EditorView, runScopeHandlers } from '@codemirror/view';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { commands, matchCommands, openCommandCompletion } from './commands.ts';

describe('commands completion', () => {
  test('prefix-matches sentinels', ({ expect }) => {
    const all = [{ sentinel: '$track' }, { sentinel: '$resume' }];
    expect(matchCommands(all, '$t').map((c) => c.sentinel)).toEqual(['$track']);
    expect(matchCommands(all, '$')).toHaveLength(2);
    expect(matchCommands(all, 'tr')).toHaveLength(0);
  });

  const all = [{ sentinel: '/task:create' }, { sentinel: '/view' }, { sentinel: '/web-search' }];

  const open = async (doc: string) => {
    const view = new EditorView({
      state: EditorState.create({ doc, extensions: commands({ getCommands: () => all }) }),
      parent: document.body,
    });
    onTestFinished(() => view.destroy());
    openCommandCompletion(view);
    await vi.waitFor(() => expect(completionStatus(view.state)).toBe('active'));
    return view;
  };

  /** Picks `sentinel`; a list ignores picks for a moment after it opens (`interactionDelay`), so this retries. */
  const pick = (view: EditorView, sentinel: string) =>
    vi.waitFor(() => {
      const index = currentCompletions(view.state).findIndex(({ label }) => label === sentinel);
      view.dispatch({ effects: setSelectedCompletion(index) });
      expect(acceptCompletion(view)).toBe(true);
    });

  test.each(['/task:create Draft the launch note', '/usr/local is broken', '/w/abc is down', '/web is down', ''])(
    'opening the list over %j leaves the text as written',
    async (doc) => {
      const view = await open(doc);
      expect(view.state.doc.toString()).toBe(doc);
      expect(currentCompletions(view.state).map(({ label }) => label)).toEqual(all.map(({ sentinel }) => sentinel));
    },
  );

  const type = (view: EditorView, text: string) => {
    for (const char of text) {
      const head = view.state.selection.main.head;
      view.dispatch({
        changes: { from: head, insert: char },
        selection: { anchor: head + 1 },
        userEvent: 'input.type',
      });
    }
  };

  const labels = (view: EditorView) => currentCompletions(view.state).map(({ label }) => label);

  const press = (view: EditorView, key: string, times = 1) => {
    for (let count = 0; count < times; count++) {
      runScopeHandlers(view, new KeyboardEvent('keydown', { key }), 'editor');
    }
  };

  test('arrow keys stop at the ends of the list rather than cycling', async () => {
    const view = await open('');
    // CodeMirror's own cycling keymap ignores keys within `interactionDelay` (75ms) of opening, which would hide it.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(selectedCompletionIndex(view.state)).toBe(0);
    press(view, 'ArrowUp');
    expect(selectedCompletionIndex(view.state)).toBe(0);
    press(view, 'ArrowDown', all.length + 2);
    expect(selectedCompletionIndex(view.state)).toBe(all.length - 1);
  });

  test.each(['', 'hello'])('typing narrows the list opened over %j', async (doc) => {
    const view = await open(doc);
    type(view, 't');
    await vi.waitFor(() => expect(labels(view)).toEqual(['/task:create']));
    await pick(view, '/task:create');
    expect(view.state.doc.toString()).toBe(doc ? `/task:create ${doc}` : '/task:create ');
  });

  test('typing the slash first narrows the list too', async () => {
    const view = await open('');
    type(view, '/v');
    await vi.waitFor(() => expect(labels(view)).toEqual(['/view']));
  });

  test.each([
    ['/task:create foo', '/view', '/view foo'],
    ['/web', '/web-search', '/web-search '],
    ['/', '/view', '/view '],
    ['/web is down', '/view', '/view /web is down'],
    ['/w/abc is down', '/view', '/view /w/abc is down'],
    ['/usr/local is broken', '/view', '/view /usr/local is broken'],
  ])('a pick over %j gives %j', async (doc, sentinel, expected) => {
    const view = await open(doc);
    await pick(view, sentinel);
    expect(view.state.doc.toString()).toBe(expected);
  });

  test('a pick leaves the cursor after the command, where its arguments go', async () => {
    const view = await open('/task:create\nDraft');
    await pick(view, '/view');
    expect(view.state.doc.toString()).toBe('/view\nDraft');
    expect(view.state.selection.main.head).toBe('/view'.length);
  });
});
