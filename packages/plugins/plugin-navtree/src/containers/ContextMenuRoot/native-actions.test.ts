//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { afterEach, describe, test } from 'vitest';

import { nativeActions, readNativeContext } from './native-actions.ts';

const ids = (context: ReturnType<typeof readNativeContext>) => nativeActions(context).map(({ id }) => id);

describe('native actions', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('a link offers open and copy', ({ expect }) => {
    document.body.innerHTML = '<a href="https://dxos.org"><span id="target">DXOS</span></a>';
    const context = readNativeContext(document.getElementById('target'));
    expect(context.link).toBe('https://dxos.org');
    expect(ids(context)).toEqual(['native.open-link', 'native.copy-link']);
  });

  test('a text field with a selection offers cut, copy and paste', ({ expect }) => {
    document.body.innerHTML = '<input id="target" value="hello world" />';
    const input = document.getElementById('target');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('input not rendered');
    }
    input.setSelectionRange(0, 5);
    const context = readNativeContext(input);
    expect(context.selection).toBe('hello');
    expect(ids(context)).toEqual(['native.cut', 'native.copy', 'native.paste']);
  });

  test('an editable host without a selection offers only paste', ({ expect }) => {
    document.body.innerHTML = '<div contenteditable="true"><p id="target">text</p></div>';
    const context = readNativeContext(document.getElementById('target'));
    expect(ids(context)).toEqual(['native.paste']);
  });

  test('plain content offers nothing', ({ expect }) => {
    document.body.innerHTML = '<div id="target">plain</div>';
    expect(ids(readNativeContext(document.getElementById('target')))).toEqual([]);
  });
});
