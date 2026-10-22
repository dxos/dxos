//
// Copyright 2026 DXOS.org
//

import React, { act, createRef } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { beforeAll, describe, onTestFinished, test } from 'vitest';

import { type EditorController } from './controller.ts';
import { EditorView } from './EditorView.tsx';

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const mountControlled = async (initial: string) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);
  const editor = createRef<EditorController>();
  const render = (value: string) => act(async () => root.render(<EditorView ref={editor} value={value} />));
  await render(initial);
  onTestFinished(() => {
    act(() => root.unmount());
    container.remove();
  });

  return {
    type: (text: string) => {
      const view = editor.current!.view!;
      view.dispatch({ changes: { from: view.state.doc.length, insert: text }, userEvent: 'input.type' });
    },
    pass: async (value: string) => {
      await render(value);
      await act(nextFrame);
    },
    doc: () => editor.current!.getText(),
  };
};

describe('EditorView', () => {
  beforeAll(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
  });

  test('a value the editor emitted earlier does not undo the keystrokes typed since', async ({ expect }) => {
    const editor = await mountControlled('a');
    editor.type('b');
    editor.type('c');
    await editor.pass('ab');
    expect(editor.doc()).toBe('abc');
    await editor.pass('abc');
    expect(editor.doc()).toBe('abc');
  });

  test('a value the editor never emitted replaces the doc', async ({ expect }) => {
    const editor = await mountControlled('a');
    editor.type('b');
    await editor.pass('ab');
    await editor.pass('reset');
    expect(editor.doc()).toBe('reset');
  });
});
