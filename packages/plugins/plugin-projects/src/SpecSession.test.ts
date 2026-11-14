//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { StateEffect, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { afterEach, describe, test } from 'vitest';

import * as SpecSession from './SpecSession.ts';

describe('SpecSession', () => {
  test('a session outlives the views that read it', async ({ expect }) => {
    const registry = AtomRegistry.make({ defaultIdleTTL: 1 });
    const unmount = registry.mount(SpecSession.session('spec'));
    registry.set(SpecSession.session('spec'), { views: { decisions: 'ledger' }, fold: false });
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(registry.get(SpecSession.session('spec')).views.decisions).toBe('ledger');
  });

  describe('of the editors one spec is open in, views follow the one last opened or focused', () => {
    const shown: EditorView[] = [];
    const cursors: [string, number][] = [];
    const open = (owner: string, doc = owner) => {
      const view = new EditorView({
        doc,
        parent: document.body,
        extensions: [SpecSession.editor('spec', owner, (offset) => cursors.push([owner, offset]))],
      });
      shown.push(view);
      return view;
    };
    /** CodeMirror reports a focus change on a timer, and a closed editor leaves on a microtask. */
    const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

    afterEach(async () => {
      shown.filter((view) => view.dom.parentNode).forEach((view) => view.destroy());
      shown.length = 0;
      cursors.length = 0;
      await settle();
    });

    test('a newly opened editor is followed and reports its cursor', ({ expect }) => {
      open('a');
      const b = open('b');
      expect([SpecSession.getEditor('spec'), cursors]).toEqual([
        b,
        [
          ['a', 0],
          ['b', 0],
        ],
      ]);
    });

    test('focus alone makes an editor followed and reports its cursor; selection in another does not', async ({
      expect,
    }) => {
      const a = open('a', 'alpha');
      const b = open('b', 'bravo');
      a.dispatch({ selection: { anchor: 3 } });
      a.focus();
      await settle();
      expect([SpecSession.getEditor('spec'), cursors.at(-1)]).toEqual([a, ['a', 3]]);
      cursors.length = 0;
      b.dispatch({ selection: { anchor: 2 }, userEvent: 'select' });
      b.dispatch({ changes: { from: 0, insert: 'x' }, annotations: [Transaction.userEvent.of('initial.sync')] });
      a.dispatch({ selection: { anchor: 4 } });
      expect([SpecSession.getEditor('spec'), cursors]).toEqual([a, [['a', 4]]]);
    });

    test('a rebuilt or reconfigured editor keeps its place; closing the followed one hands over to the other', async ({
      expect,
    }) => {
      const a = open('a', 'alpha');
      const b = open('b', 'bravo');
      a.focus();
      await settle();
      // A rebuild, as `useTextEditor` does it: the old view closes, then a new one opens under the same owner.
      a.destroy();
      const a2 = open('a', 'alpha');
      b.dispatch({ effects: StateEffect.reconfigure.of([SpecSession.editor('spec', 'b', () => {})]) });
      await settle();
      expect(SpecSession.getEditor('spec')).toBe(a2);
      b.dispatch({
        effects: StateEffect.reconfigure.of([SpecSession.editor('spec', 'b', (offset) => cursors.push(['b', offset]))]),
      });
      await settle();
      b.dispatch({ selection: { anchor: 2 } });
      cursors.length = 0;
      a2.destroy();
      await settle();
      expect([SpecSession.getEditor('spec'), cursors]).toEqual([b, [['b', 2]]]);
      b.destroy();
      await settle();
      expect(SpecSession.getEditor('spec')).toBeUndefined();
    });

    test('closing the followed editor hands over to the one opened or focused before it', async ({ expect }) => {
      const a = open('a');
      open('b');
      a.focus();
      await settle();
      const c = open('c');
      c.destroy();
      await settle();
      expect(SpecSession.getEditor('spec')).toBe(a);
    });
  });
});
