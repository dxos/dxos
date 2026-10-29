//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { clickSelects, editableTool, groundSnap, orbitButtons, restingCenter } from './tools.ts';

describe('tools', () => {
  test('the orbit tool gives the left button to the orbit; every other tool keeps it', () => {
    expect(orbitButtons('orbit')).toBe('all');
    expect(orbitButtons('select')).toBe('secondary');
    expect(orbitButtons('move')).toBe('secondary');
    expect(orbitButtons({ create: 'cube' })).toBe('secondary');
  });

  test('a click with the orbit tool selects nothing', () => {
    expect(clickSelects('orbit')).toBe(false);
    expect(clickSelects('select')).toBe(true);
  });

  test('a new shape rests on the ground: its unit body sits above the point clicked, not through it', () => {
    expect(restingCenter({ x: 2, y: 0, z: -1 })).toEqual({ x: 2, y: 0.5, z: -1 });
  });

  test('locked, only select and orbit stay: every editing tool falls back to select', () => {
    expect(editableTool('orbit', true)).toBe('orbit');
    expect(editableTool('select', true)).toBe('select');
    for (const tool of ['move', 'rotate', 'scale', 'link', 'extrude'] as const) {
      expect(editableTool(tool, true)).toBe('select');
    }
    expect(editableTool({ create: 'cube' }, true)).toBe('select');
    expect(editableTool('move', false)).toBe('move');
  });

  test('a placed point snaps to the nearest grid point on the ground, and stays put with snapping off', () => {
    expect(groundSnap({ x: 1.4, y: 0, z: -2.6 }, 1)).toEqual({ x: 1, y: 0, z: -3 });
    expect(groundSnap({ x: 1.4, y: 0, z: -2.6 }, 0)).toEqual({ x: 1.4, y: 0, z: -2.6 });
  });
});
