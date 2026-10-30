//
// Copyright 2026 DXOS.org
//

import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeAll, describe, onTestFinished, test } from 'vitest';

import { type EditorView } from '@dxos/ui-editor';

import { type UseTextEditorProps, useTextEditor } from './useTextEditor.ts';

const AutoFocusEditor = () => {
  const { parentRef } = useTextEditor({ autoFocus: true });
  return <div ref={parentRef} />;
};

const RestoringEditor = ({ onView, ...props }: UseTextEditorProps & { onView: (view: EditorView) => void }) => {
  const { parentRef, view } = useTextEditor(props);
  useEffect(() => {
    if (view) {
      onView(view);
    }
  }, [view]);
  return <div ref={parentRef} />;
};

const mount = async (element: React.ReactElement): Promise<HTMLElement> => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  onTestFinished(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
};

const mountAutoFocusEditor = () => mount(<AutoFocusEditor />);

describe('useTextEditor', () => {
  beforeAll(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
  });

  test('autoFocus focuses the editor', async ({ expect }) => {
    const container = await mountAutoFocusEditor();
    expect(container.contains(document.activeElement)).toBe(true);
  });

  test('autoFocus leaves focus in an open menu', async ({ expect }) => {
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    menu.tabIndex = -1;
    document.body.append(menu);
    onTestFinished(() => menu.remove());
    menu.focus();

    await mountAutoFocusEditor();
    expect(document.activeElement).toBe(menu);
  });

  // A bound editor mounts empty and the binding fills it afterwards; the recorded caret must land
  // once the content arrives rather than being dropped against the empty document.
  test('restores the selection once the content arrives', async ({ expect }) => {
    let view: EditorView | undefined;
    await mount(<RestoringEditor id='doc' selection={{ anchor: 5 }} onView={(next) => (view = next)} />);
    expect(view?.state.doc.length).toBe(0);

    await act(async () => {
      view?.dispatch({ changes: { from: 0, insert: 'hello world' } });
      await Promise.resolve();
    });
    expect(view?.state.selection.main.anchor).toBe(5);
  });

  test('restores the selection immediately when the content is present', async ({ expect }) => {
    let view: EditorView | undefined;
    await mount(
      <RestoringEditor
        id='doc'
        initialValue='hello world'
        selection={{ anchor: 7 }}
        onView={(next) => (view = next)}
      />,
    );
    expect(view?.state.selection.main.anchor).toBe(7);
  });

  // A document that shrank while closed: the scroll no longer fits, the selection still does.
  test('restores the part of the state that still fits', async ({ expect }) => {
    let view: EditorView | undefined;
    await mount(
      <RestoringEditor
        id='doc'
        initialValue='hello world'
        scrollTo={500}
        selection={{ anchor: 3 }}
        onView={(next) => (view = next)}
      />,
    );
    expect(view?.state.selection.main.anchor).toBe(3);
  });

  test('restores the part of the state that fits the content once it arrives', async ({ expect }) => {
    let view: EditorView | undefined;
    await mount(<RestoringEditor id='doc' scrollTo={500} selection={{ anchor: 5 }} onView={(next) => (view = next)} />);

    await act(async () => {
      view?.dispatch({ changes: { from: 0, insert: 'hello world' } });
      await Promise.resolve();
    });
    expect(view?.state.selection.main.anchor).toBe(5);
  });
});
