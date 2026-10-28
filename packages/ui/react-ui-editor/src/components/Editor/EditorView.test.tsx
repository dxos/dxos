//
// Copyright 2026 DXOS.org
//

import React, { act, createRef, useLayoutEffect, useState } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { beforeAll, describe, onTestFinished, test } from 'vitest';

import { type EditorController } from './controller.ts';
import { EditorView } from './EditorView.tsx';

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

type CallerProps = {
  initial: string;
  editor: React.Ref<EditorController>;
  transform?: (value: string) => string;
  onCommit?: (value: string) => void;
};

/** Holds the editor's value in React state, as a form or a `useState` caller does. */
const Caller = ({ initial, editor, transform = (value) => value, onCommit }: CallerProps) => {
  const [value, setValue] = useState(initial);
  useLayoutEffect(() => onCommit?.(value), [value]);
  return <EditorView ref={editor} value={value} onChange={(next) => setValue(transform(next))} />;
};

const mount = async (props: Omit<CallerProps, 'editor'>) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);
  const editor = createRef<EditorController>();
  await act(async () => root.render(<Caller {...props} editor={editor} />));
  onTestFinished(() => {
    act(() => root.unmount());
    container.remove();
  });

  const type = (text: string) => {
    const view = editor.current!.view!;
    view.dispatch({ changes: { from: view.state.doc.length, insert: text }, userEvent: 'input.type' });
  };

  return {
    type,
    act: async (fn: () => void) => {
      await act(async () => fn());
      await act(nextFrame);
    },
    doc: () => editor.current!.getText(),
  };
};

describe('EditorView', () => {
  beforeAll(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
  });

  test('a value rendered before the next keystroke does not undo it', async ({ expect }) => {
    let typed = false;
    const editor = await mount({
      initial: 'a',
      onCommit: (value) => {
        if (value === 'ab' && !typed) {
          typed = true;
          editor.type('c');
        }
      },
    });
    await editor.act(() => editor.type('b'));
    expect(editor.doc()).toBe('abc');
  });

  test('a value the caller derives after the keystrokes replaces the doc', async ({ expect }) => {
    const editor = await mount({ initial: 'a', transform: (value) => value.slice(0, 2) });
    await editor.act(() => {
      editor.type('b');
      editor.type('c');
    });
    expect(editor.doc()).toBe('ab');
  });
});
