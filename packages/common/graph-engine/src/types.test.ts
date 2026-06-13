//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LayoutEdge, type LayoutNode, type Point, type Rect, rectContains } from './types';

describe('types', () => {
  test('rectContains returns true for point inside rect', ({ expect }) => {
    const r: Rect = { x: 0, y: 0, width: 10, height: 10 };
    const p: Point = [5, 5];
    expect(rectContains(r, p)).toBe(true);
  });

  test('rectContains returns false for point outside rect', ({ expect }) => {
    const r: Rect = { x: 0, y: 0, width: 10, height: 10 };
    expect(rectContains(r, [15, 5])).toBe(false);
    expect(rectContains(r, [5, -1])).toBe(false);
  });

  test('LayoutNode has id and optional position/radius', ({ expect }) => {
    const n: LayoutNode = { id: 'a', type: 't', x: 1, y: 2, r: 3 };
    expect(n.id).toBe('a');
  });

  test('LayoutEdge holds source and target refs', ({ expect }) => {
    const a: LayoutNode = { id: 'a' };
    const b: LayoutNode = { id: 'b' };
    const e: LayoutEdge = { id: 'e1', source: a, target: b };
    expect(e.source.id).toBe('a');
  });
});
