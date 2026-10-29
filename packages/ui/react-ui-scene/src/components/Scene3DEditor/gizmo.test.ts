//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Resolved3D, type Scene, applyIntent } from '@dxos/scene';

import { gizmoIntent } from './gizmo.ts';

const BEFORE: Resolved3D = {
  id: 'a',
  kind: 'cube',
  center: { x: 1, y: 0, z: 0 },
  rotation: { x: 0, y: 10, z: 0 },
  scale: { x: 1, y: 2, z: 1 },
};

const SAME = { center: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 10, z: 0 }, scale: { x: 1, y: 2, z: 1 } };

describe('gizmoIntent', () => {
  test('a move drag yields move with the center delta', () => {
    expect(gizmoIntent('move', 'a', BEFORE, { ...SAME, center: { x: 1.5, y: 2, z: -1 } })).toEqual({
      kind: 'move',
      ids: ['a'],
      delta: { x: 0.5, y: 2, z: -1 },
    });
  });

  test('a rotate drag yields degrees', () => {
    expect(gizmoIntent('rotate', 'a', BEFORE, { ...SAME, rotation: { x: 0, y: 55, z: 0 } })).toEqual({
      kind: 'rotate',
      ids: ['a'],
      delta: { x: 0, y: 45, z: 0 },
    });
  });

  test('a scale drag sets the scale it ends at', () => {
    expect(gizmoIntent('scale', 'a', BEFORE, { ...SAME, scale: { x: 2, y: 3, z: 1 } })).toEqual({
      kind: 'update',
      id: 'a',
      path: ['scale'],
      value: { x: 2, y: 3, z: 1 },
    });
  });

  test('scaling an element whose object supplies its scale grows it from that scale', () => {
    // The object scales by 2 and the element sets none; the resolved element is what the gizmo started from.
    const before: Resolved3D = { id: 'a', kind: 'cube', object: 'box', scale: { x: 2, y: 2, z: 2 } };
    const layout: Scene.LayoutRecord3D = { id: 'l', dim: '3d', elements: { a: { id: 'a', object: 'box' } } };
    const intent = gizmoIntent('scale', 'a', before, { ...SAME, scale: { x: 3, y: 3, z: 3 } });
    expect(intent && applyIntent(layout, intent).elements.a.scale).toEqual({ x: 3, y: 3, z: 3 });
  });

  test('an unchanged transform yields undefined', () => {
    expect(gizmoIntent('move', 'a', BEFORE, SAME)).toBeUndefined();
    expect(gizmoIntent('rotate', 'a', BEFORE, SAME)).toBeUndefined();
    expect(gizmoIntent('scale', 'a', BEFORE, SAME)).toBeUndefined();
  });
});
