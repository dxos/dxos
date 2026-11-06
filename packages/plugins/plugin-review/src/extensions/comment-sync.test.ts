//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { type ReviewCapabilities } from '#types';

import { trackFocus } from './comment-sync.ts';

describe('trackFocus', () => {
  const setup = () => {
    const registry = AtomRegistry.make();
    const stateAtom = Atom.make<ReviewCapabilities.CommentState>({ toolbar: {}, drafts: {} }).pipe(Atom.keepAlive);
    const editor = (subject: string) =>
      new EditorView({
        parent: document.body,
        state: EditorState.create({ doc: 'text', extensions: [trackFocus({ registry, stateAtom }, subject)] }),
      });
    return { registry, stateAtom, editor };
  };

  test('the editor focused last stays recorded after it blurs, until it is destroyed', async ({ expect }) => {
    const { registry, stateAtom, editor } = setup();
    const first = editor('echo:a');
    const second = editor('echo:b');

    const focused = () => registry.get(stateAtom).focused;

    first.focus();
    await expect.poll(() => focused()?.view).toBe(first);
    expect(focused()?.subject).toBe('echo:a');

    second.focus();
    await expect.poll(() => focused()?.view).toBe(second);
    expect(focused()?.subject).toBe('echo:b');

    second.contentDOM.blur();
    first.destroy();
    expect(focused()?.view).toBe(second);

    second.destroy();
    expect(focused()).toBeUndefined();
  });
});
