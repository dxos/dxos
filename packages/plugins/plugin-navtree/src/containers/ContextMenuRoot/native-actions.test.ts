//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { afterEach, describe, test } from 'vitest';

import * as AppNode from '@dxos/app-toolkit/AppNode';

import { nativeActions, readNativeContext } from './native-actions.ts';

const ids = (context: ReturnType<typeof readNativeContext>) => nativeActions(context).map(({ id }) => id);

describe('native actions', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('a link offers open and copy', ({ expect }) => {
    document.body.innerHTML = '<a href="https://dxos.org/docs"><span id="target">DXOS</span></a>';
    const context = readNativeContext(document.getElementById('target'));
    expect(context.link).toBe('https://dxos.org/docs');
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
    expect(ids(context)).toEqual(['edit.cut', 'edit.copy', 'edit.paste']);
  });

  test('an editable host without a selection offers only paste', ({ expect }) => {
    document.body.innerHTML = '<div contenteditable="true"><p id="target">text</p></div>';
    const context = readNativeContext(document.getElementById('target'));
    expect(ids(context)).toEqual(['edit.paste']);
  });

  test('plain content offers nothing', ({ expect }) => {
    document.body.innerHTML = '<div id="target">plain</div>';
    expect(ids(readNativeContext(document.getElementById('target')))).toEqual([]);
  });

  test("a container's commands add undo and redo, greyed out when they cannot run, and replace its clipboard", ({
    expect,
  }) => {
    document.body.innerHTML = '<div id="outer"><div id="inner"><span id="target">shape</span></div></div>';
    const command = (enabled: boolean) => ({ run: () => {}, enabled: () => enabled });
    const outer = document.getElementById('outer');
    const inner = document.getElementById('inner');
    if (!outer || !inner) {
      throw new Error('containers not rendered');
    }
    const unregisterOuter = AppNode.registerEditCommands(outer, { undo: command(true), redo: command(true) });
    const unregisterInner = AppNode.registerEditCommands(inner, {
      undo: command(true),
      redo: command(false),
      copy: command(true),
    });

    const target = document.getElementById('target');
    const commands = AppNode.findEditCommands(target);
    const actions = nativeActions(readNativeContext(target), commands);
    expect(actions.map(({ id }) => id)).toEqual(['edit.undo', 'edit.redo', 'edit.copy']);
    expect(actions.map(({ properties }) => properties.disabled)).toEqual([false, true, false]);

    // Withdrawn, the innermost container's commands give way to the next one out.
    unregisterInner();
    expect(AppNode.findEditCommands(target)?.redo.enabled()).toBe(true);
    unregisterOuter();
    expect(AppNode.findEditCommands(target)).toBeUndefined();
  });
});
