//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { orbitGesture } from './orbit-gesture.ts';

const press = (button: number, keys: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean } = {}) => ({
  button,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  ...keys,
});

describe('orbitGesture', () => {
  test('while a tool has the left button, only the command key lends it to the camera', () => {
    expect(orbitGesture(press(0), 'secondary')).toBeUndefined();
    expect(orbitGesture(press(0, { metaKey: true }), 'secondary')).toBe('orbit');
    expect(orbitGesture(press(0, { ctrlKey: true, shiftKey: true }), 'secondary')).toBe('pan');
  });

  test('the middle button orbits (Shift pans), and the right button is left to the context menu', () => {
    expect(orbitGesture(press(1), 'secondary')).toBe('orbit');
    expect(orbitGesture(press(1, { shiftKey: true }), 'secondary')).toBe('pan');
    expect(orbitGesture(press(2), 'secondary')).toBeUndefined();
    expect(orbitGesture(press(0), 'all')).toBe('orbit');
    expect(orbitGesture(press(0, { shiftKey: true }), 'all')).toBe('pan');
  });
});
