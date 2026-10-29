//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  KEY_BINDINGS,
  type KeyEventLike,
  isHandDrag,
  isToolKey,
  keyAction,
  matchesBinding,
  shortcutLabel,
} from './keys.ts';

const press = (key: string, modifiers: Partial<Omit<KeyEventLike, 'key'>> = {}): KeyEventLike => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...modifiers,
});

describe('keys', () => {
  test('the command key is meta or control, and shift tells undo from redo', ({ expect }) => {
    expect(keyAction(press('z', { metaKey: true }))).toBe('undo');
    expect(keyAction(press('z', { ctrlKey: true }))).toBe('undo');
    expect(keyAction(press('Z', { metaKey: true, shiftKey: true }))).toBe('redo');
    expect(keyAction(press('z'))).toBeUndefined();
  });

  test('a chord that leaves shift unstated accepts either, so shift can modify the action', ({ expect }) => {
    expect(keyAction(press('ArrowLeft'))).toBe('nudge');
    expect(keyAction(press('ArrowLeft', { shiftKey: true }))).toBe('nudge');
    expect(keyAction(press('ArrowLeft', { altKey: true }))).toBe('back');
  });

  test('the command key and D duplicate, while a plain D stays the debug toggle', ({ expect }) => {
    expect(keyAction(press('d', { metaKey: true }))).toBe('duplicate');
    expect(keyAction(press('d', { ctrlKey: true }))).toBe('duplicate');
    expect(keyAction(press('d'))).toBe('debug');
  });

  test('a left-button press with the command key held is the hand tool, with any tool', ({ expect }) => {
    expect(isHandDrag({ button: 0, metaKey: true, ctrlKey: false })).toBe(true);
    expect(isHandDrag({ button: 0, metaKey: false, ctrlKey: true })).toBe(true);
    expect(isHandDrag({ button: 0, metaKey: false, ctrlKey: false })).toBe(false);
    expect(isHandDrag({ button: 2, metaKey: true, ctrlKey: false })).toBe(false);
  });

  test('letters without a command or option modifier fall through to the tool palette', ({ expect }) => {
    expect(keyAction(press('r'))).toBeUndefined();
    expect(isToolKey(press('r'))).toBe(true);
    expect(isToolKey(press('r', { metaKey: true }))).toBe(false);
    expect(isToolKey(press('r', { altKey: true }))).toBe(false);
    expect(keyAction(press('g'))).toBe('snap');
    expect(keyAction(press(';'))).toBe('guides');
  });

  test('every binding matches itself and labels read as a menu shows them', ({ expect }) => {
    for (const bindings of Object.values(KEY_BINDINGS)) {
      for (const binding of bindings) {
        const event = press(binding.key, {
          metaKey: binding.meta ?? false,
          shiftKey: binding.shift ?? false,
          altKey: binding.alt ?? false,
        });
        expect(matchesBinding(event, binding)).toBe(true);
      }
    }
    expect(shortcutLabel({ key: 'Home' })).toBe('Home');
    expect(shortcutLabel({ key: 'z', meta: true, shift: true })).toMatch(/Z$/);
    expect(shortcutLabel({ key: 'ArrowLeft', alt: true })).toMatch(/←$/);
    // A shifted digit reads as its key cap, since Shift is already shown.
    expect(shortcutLabel({ key: ')', shift: true })).toMatch(/0$/);
    expect(shortcutLabel({ key: '!', shift: true })).toMatch(/1$/);
  });
});
