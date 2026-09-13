//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { afterEach, describe, test } from 'vitest';

import { focusPane } from './focus-pane.ts';

const mount = () => {
  const pane = document.createElement('div');
  pane.tabIndex = -1;
  const editor = document.createElement('div');
  editor.tabIndex = 0;
  editor.contentEditable = 'true';
  pane.append(editor);
  const outside = document.createElement('button');
  document.body.append(pane, outside);
  return { pane, editor, outside };
};

describe('focusPane', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  test('leaves focus on an element inside the pane', ({ expect }) => {
    const { pane, editor } = mount();
    editor.focus();
    focusPane(pane);
    expect(document.activeElement).toBe(editor);
  });

  test('focuses the pane when focus is outside it', ({ expect }) => {
    const { pane, outside } = mount();
    outside.focus();
    focusPane(pane);
    expect(document.activeElement).toBe(pane);
  });
});
