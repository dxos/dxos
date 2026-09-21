//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { KEY_BINDINGS, type KeyEventLike, isToolKey, keyAction, matchesBinding, shortcutLabel } from './keys.ts';

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

  test('letters without a command or option modifier fall through to the tool palette', ({ expect }) => {
    expect(keyAction(press('r'))).toBeUndefined();
    expect(isToolKey(press('r'))).toBe(true);
    expect(isToolKey(press('r', { metaKey: true }))).toBe(false);
    expect(isToolKey(press('r', { altKey: true }))).toBe(false);
    expect(keyAction(press('g'))).toBe('snap');
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
  });
});
