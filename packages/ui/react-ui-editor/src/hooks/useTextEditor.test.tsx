//
// Copyright 2026 DXOS.org
//

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeAll, describe, onTestFinished, test } from 'vitest';

import { useTextEditor } from './useTextEditor.ts';

const AutoFocusEditor = () => {
  const { parentRef } = useTextEditor({ autoFocus: true });
  return <div ref={parentRef} />;
};

const mountAutoFocusEditor = async (): Promise<HTMLElement> => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<AutoFocusEditor />));
  onTestFinished(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
};

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
});
