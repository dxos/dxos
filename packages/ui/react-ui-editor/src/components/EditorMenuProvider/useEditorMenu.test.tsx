//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeAll, describe, onTestFinished, test, vi } from 'vitest';

import { useTextEditor } from '../../hooks/index.ts';
import { type EditorMenuGroup, type EditorMenuItem, createMenuGroup } from './menu.ts';
import { popoverStateField } from './popover.ts';
import { type UseEditorMenuProps, useEditorMenu } from './useEditorMenu.ts';

const getMenu: UseEditorMenuProps['getMenu'] = ({ text }): EditorMenuGroup[] => [
  { id: 'create', items: [{ id: 'create', label: 'Add object' }] },
  createMenuGroup({ id: 'test', filter: text, items: ['Hello world', 'Hello DXOS', 'Goodbye world'] }),
];

type Menu = { view: EditorView; labels: () => EditorMenuItem['label'][]; cancel: () => void };

const MenuEditor = ({
  onReady,
  getMenu: getMenuProp = getMenu,
}: {
  onReady: (menu: Menu) => void;
  getMenu?: UseEditorMenuProps['getMenu'];
}) => {
  const { groupsRef, extension, onCancel } = useEditorMenu({
    trigger: '@',
    multiWordTriggers: ['@'],
    getMenu: getMenuProp,
  });
  const { parentRef, view } = useTextEditor({ extensions: [extension] });
  useEffect(() => {
    if (view) {
      onReady({
        view,
        labels: () => groupsRef.current.flatMap((group) => group.items.map((item) => item.label)),
        cancel: () => onCancel?.({ view }),
      });
    }
  }, [view, groupsRef, onCancel, onReady]);

  return <div ref={parentRef} />;
};

const mountMenuEditor = async (menuProvider?: UseEditorMenuProps['getMenu']): Promise<Menu> => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let menu: Menu | undefined;
  await act(async () => root.render(<MenuEditor onReady={(ready) => (menu = ready)} getMenu={menuProvider} />));
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

const press = (view: EditorView, key: string) =>
  view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('useEditorMenu', () => {
  beforeAll(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
  });

  test('a multi-word query stays open as the user types, matching or not', async ({ expect }) => {
    const { view, labels } = await mountMenuEditor();
    const isOpen = () => view.state.field(popoverStateField) !== null;

    await act(async () => type(view, '@hello '));
    await vi.waitFor(() => expect(labels()).toEqual(['Add object', 'Hello world', 'Hello DXOS']));

    await act(async () => type(view, 'w'));
    await vi.waitFor(() => expect(labels()).toEqual(['Add object', 'Hello world']));

    await act(async () => type(view, 'x and more'));
    await vi.waitFor(() => expect(labels()).toEqual(['Add object']));
    expect(isOpen()).toBe(true);
  });

  test('Enter picks the highlighted row in place of a multi-word query', async ({ expect }) => {
    const { view, labels } = await mountMenuEditor();
    await act(async () => type(view, '@hello w'));
    await vi.waitFor(() => expect(labels()).toEqual(['Add object', 'Hello world']));

    await act(async () => press(view, 'ArrowDown'));
    await act(async () => press(view, 'Enter'));
    expect(view.state.doc.toString()).toBe('Hello world');
    expect(view.state.field(popoverStateField)).toBeNull();
  });

  test('moving the cursor out of a multi-word query ends it', async ({ expect }) => {
    const { view } = await mountMenuEditor();
    await act(async () => type(view, 'x @hello world'));
    expect(view.state.field(popoverStateField)).not.toBeNull();

    await act(async () => view.dispatch({ selection: { anchor: 0 } }));
    expect(view.state.field(popoverStateField)).toBeNull();
  });

  test('a double or leading space ends the query', async ({ expect }) => {
    const { view } = await mountMenuEditor();
    await act(async () => type(view, '@hello  '));
    expect(view.state.field(popoverStateField)).toBeNull();

    await act(async () => type(view, '@ '));
    expect(view.state.field(popoverStateField)).toBeNull();
  });

  test('cancel keeps a multi-word query in the document', async ({ expect }) => {
    const { view, cancel } = await mountMenuEditor();
    await act(async () => type(view, '@hello world'));
    cancel();
    expect(view.state.doc.toString()).toBe('@hello world');
  });

  test('Enter while a search is pending picks the row on screen', async ({ expect }) => {
    let landed = 0;
    const slowMenu: UseEditorMenuProps['getMenu'] = async ({ text }) => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      landed++;
      return [createMenuGroup({ id: 'test', filter: text, items: ['Hello world', 'Goodbye world'] })];
    };
    const { view, labels } = await mountMenuEditor(slowMenu);
    await act(async () => type(view, '@'));
    await vi.waitFor(() => expect(labels()).toEqual(['Hello world', 'Goodbye world']));

    const before = landed;
    await act(async () => {
      type(view, 'good');
      press(view, 'Enter');
    });
    expect(view.state.doc.toString()).toBe('Hello world');
    await vi.waitFor(() => expect(landed).toBeGreaterThan(before));
    expect(view.state.doc.toString()).toBe('Hello world');
    expect(labels()).toEqual([]);
  });
});
