//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { orbitGesture, wheelGesture } from './orbit-gesture.ts';

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

describe('wheelGesture', () => {
  const wheel = (
    props: Partial<{
      deltaX: number;
      deltaY: number;
      deltaMode: number;
      ctrlKey: boolean;
      metaKey: boolean;
      shiftKey: boolean;
    }>,
  ) => ({ deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false, metaKey: false, shiftKey: false, ...props });

  test('a trackpad pinch zooms', () => {
    expect(wheelGesture(wheel({ deltaY: 10, ctrlKey: true }))).toMatchObject({ kind: 'zoom' });
  });

  test('a two-finger trackpad swipe orbits the way the fingers move, and pans with Shift', () => {
    expect(wheelGesture(wheel({ deltaX: -12, deltaY: 4 }))).toEqual({ kind: 'orbit', delta: { x: 12, y: -4 } });
    expect(wheelGesture(wheel({ deltaX: -12, deltaY: 4, shiftKey: true }))).toEqual({
      kind: 'pan',
      delta: { x: 12, y: -4 },
    });
  });

  test('a mouse wheel notch zooms', () => {
    expect(wheelGesture(wheel({ deltaY: 3, deltaMode: 1 }))).toMatchObject({ kind: 'zoom' });
  });
});
