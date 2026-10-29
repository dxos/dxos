//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { sceneTree } from './hierarchy.ts';
import type * as Scene from './Scene.ts';

const scene = (id: string, children: string[]): Scene.SceneRecord2D => ({
  id,
  dim: '2d',
  camera: { center: { x: 0, y: 0 }, zoom: 1 },
  elements: Object.fromEntries(
    children.map((child) => [`to-${child}`, { id: `to-${child}`, kind: 'scene', scene: child }]),
  ),
});

describe('sceneTree', () => {
  test('orders scenes depth-first from the root', () => {
    const { order, problems } = sceneTree({ scenes: [scene('a', ['b', 'c']), scene('b', []), scene('c', [])] });
    expect(order).toEqual(['a', 'b', 'c']);
    expect(problems).toEqual([]);
  });

  test('reports a cycle and stops', () => {
    const { order, problems } = sceneTree({ scenes: [scene('a', ['b']), scene('b', ['a'])] });
    expect(order).toEqual(['a', 'b']);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('cycle');
  });
});
