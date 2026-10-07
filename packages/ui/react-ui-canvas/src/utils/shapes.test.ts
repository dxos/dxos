//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { cloneShape, createNode } from './shapes.ts';

describe('shapes', () => {
  test('a cloned shape keeps the look and size but not the text, identity or place', ({ expect }) => {
    const source = {
      ...createNode({ type: 'rect', id: 'a', z: 'a0', center: { x: 0, y: 0 }, size: { width: 192, height: 96 } }),
      label: 'Source',
      portsPerSide: 2,
      style: { hue: 'teal', rounded: true },
    };
    const fresh = createNode({ type: 'rect', id: 'b', z: 'a1', center: { x: 400, y: 0 }, size: source.size });
    expect(cloneShape(source, fresh, [{ field: 'label' }])).toEqual({
      type: 'rect',
      id: 'b',
      z: 'a1',
      center: { x: 400, y: 0 },
      size: { width: 192, height: 96 },
      portsPerSide: 2,
      style: { hue: 'teal', rounded: true },
    });
  });

  test('a cloned portal opens onto its own scene, and a note gets its type text', ({ expect }) => {
    const portal = createNode({ type: 'scene', id: 'p', z: 'a0', center: { x: 0, y: 0 }, scene: 'scene:p' });
    const copy = cloneShape(portal, createNode({ type: 'scene', id: 'q', z: 'a1', center: { x: 0, y: 0 } }));
    expect(copy).toMatchObject({ id: 'q', scene: 'q' });

    const named = { ...createNode({ type: 'note', id: 'c', z: 'a0', center: { x: 0, y: 0 } }), text: 'Mine' };
    const fresh = createNode({ type: 'note', id: 'd', z: 'a1', center: { x: 0, y: 0 } });
    expect(cloneShape(named, fresh, [{ field: 'text', multiline: true }])).toMatchObject({ id: 'd', text: 'Note' });
  });
});
