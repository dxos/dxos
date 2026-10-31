//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import {
  clickCreates,
  clickSelects,
  doubleClickTarget,
  editableTool,
  faceName,
  groundSnap,
  menuSelection,
  orbitButtons,
  restingCenter,
} from './tools.ts';

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

  test('a create or place tool creates only on empty space; on an element the click selects, as Select does', () => {
    expect(clickCreates({ create: 'cube' }, undefined)).toBe(true);
    expect(clickCreates({ create: 'cube' }, 'box')).toBe(false);
    expect(clickCreates({ place: 'hub' }, 'box')).toBe(false);
    expect(clickCreates('select', undefined)).toBe(false);
  });

  test('a right-click on an unselected element selects it first; on the selection or empty space it keeps it', () => {
    expect(menuSelection(['a'], 'b')).toEqual(['b']);
    expect(menuSelection(['a', 'b'], 'b')).toEqual(['a', 'b']);
    expect(menuSelection(['a'], undefined)).toEqual(['a']);
  });

  test('a double-click drills into a composite, selects the picked face of a plain element, and else does nothing', () => {
    expect(doubleClickTarget('team', 'team-parts', { x: 0.2, y: 0.9, z: 0 })).toEqual({ drill: 'team-parts' });
    expect(doubleClickTarget('box', undefined, { x: 0.2, y: 0.9, z: 0.1 })).toEqual({
      face: { element: 'box', normal: { x: 0, y: 1, z: 0 } },
    });
    expect(doubleClickTarget('box', undefined, undefined)).toBeUndefined();
    expect(doubleClickTarget(undefined, undefined, { x: 0, y: 1, z: 0 })).toBeUndefined();
  });

  test('a face is named by the axis it points out along', () => {
    expect(faceName({ x: 0, y: 1, z: 0 })).toBe('+Y');
    expect(faceName({ x: -1, y: 0, z: 0 })).toBe('−X');
    expect(faceName({ x: 0, y: 0, z: 1 })).toBe('+Z');
  });
});
