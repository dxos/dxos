//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeAll, describe, onTestFinished, test, vi } from 'vitest';

import { useTextEditor } from '../../hooks/index.ts';
import { type EditorMenuGroup, type EditorMenuItem, createMenuGroup } from './menu.ts';
import { popoverStateField } from './popover.ts';
import { type UseEditorMenuProps, useEditorMenu } from './useEditorMenu.ts';

const getMenu: UseEditorMenuProps['getMenu'] = ({ text }): EditorMenuGroup[] => [
  { id: 'create', fallback: true, items: [{ id: 'create', label: 'Add object' }] },
  createMenuGroup({ id: 'test', filter: text, items: ['Hello world', 'Hello DXOS', 'Goodbye world'] }),
];

type Menu = { view: EditorView; labels: () => EditorMenuItem['label'][] };

const MenuEditor = ({ onReady }: { onReady: (menu: Menu) => void }) => {
  const { groupsRef, extension } = useEditorMenu({ trigger: '@', multiWordTriggers: ['@'], getMenu });
  const { parentRef, view } = useTextEditor({ extensions: [extension] });
  if (view) {
    onReady({ view, labels: () => groupsRef.current.flatMap((group) => group.items.map((item) => item.label)) });
  }

  return <div ref={parentRef} />;
};

const mountMenuEditor = async (): Promise<Menu> => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let menu: Menu | undefined;
  await act(async () => root.render(<MenuEditor onReady={(ready) => (menu = ready)} />));
  onTestFinished(() => {
    act(() => root.unmount());
    container.remove();
  });
  return vi.waitFor(() => menu!);
};

/** Types as a user does: the trigger through its keymap, the rest as input. */
const type = (view: EditorView, text: string) => {
  for (const char of text) {
    const event = new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true });
    view.contentDOM.dispatchEvent(event);
    if (!event.defaultPrevented) {
      const head = view.state.selection.main.head;
      view.dispatch({
        changes: { from: head, insert: char },
        selection: { anchor: head + 1 },
        userEvent: 'input.type',
      });
    }
  }
};

describe('useEditorMenu', () => {
  beforeAll(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
  });

  test('a multi-word query stays open while it matches, then closes and keeps the text', async ({ expect }) => {
    const { view, labels } = await mountMenuEditor();
    const isOpen = () => view.state.field(popoverStateField) !== null;

    await act(async () => type(view, '@hello '));
    await vi.waitFor(() => expect(labels()).toEqual(['Add object', 'Hello world', 'Hello DXOS']));
    expect(isOpen()).toBe(true);

    await act(async () => type(view, 'w'));
    await vi.waitFor(() => expect(labels()).toEqual(['Add object', 'Hello world']));

    await act(async () => type(view, 'x'));
    await vi.waitFor(() => expect(isOpen()).toBe(false));
    expect(view.state.doc.toString()).toBe('@hello wx');
  });

  test('a leading space closes the menu', async ({ expect }) => {
    const { view } = await mountMenuEditor();
    await act(async () => type(view, '@ '));
    expect(view.state.field(popoverStateField)).toBeNull();
  });
});
