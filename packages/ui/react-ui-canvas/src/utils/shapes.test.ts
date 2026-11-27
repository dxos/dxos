//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Link } from '@dxos/scene';

import { cloneShape, createLink, createNode, flipLink } from './shapes.ts';

describe('shapes', () => {
  test('a new spline has no control points until one is added', ({ expect }) => {
    const link = createLink({ path: 'spline', id: 's', z: 'a0', source: { node: 'a' }, target: { node: 'b' } });
    expect(link).toEqual({
      kind: 'link',
      path: 'spline',
      id: 's',
      z: 'a0',
      source: { node: 'a' },
      target: { node: 'b' },
      points: [],
    });
  });

  test('a cloned shape keeps the look and size but not the text, identity or place', ({ expect }) => {
    const source = {
      ...createNode({ kind: 'rect', id: 'a', z: 'a0', center: { x: 0, y: 0 }, size: { width: 192, height: 96 } }),
      label: 'Source',
      portsPerSide: 2,
      style: 'warn',
      overrides: { color: 'teal', corners: 'all' as const },
    };
    const fresh = createNode({ kind: 'rect', id: 'b', z: 'a1', center: { x: 400, y: 0 }, size: source.size });
    expect(cloneShape(source, fresh, [{ field: 'label' }])).toEqual({
      kind: 'rect',
      id: 'b',
      z: 'a1',
      center: { x: 400, y: 0 },
      size: { width: 192, height: 96 },
      portsPerSide: 2,
      style: 'warn',
      overrides: { color: 'teal', corners: 'all' },
    });
  });

  test('a cloned portal opens onto its own scene, and a note gets its kind text', ({ expect }) => {
    const portal = createNode({ kind: 'view', id: 'p', z: 'a0', center: { x: 0, y: 0 }, scene: 'scene:p' });
    const copy = cloneShape(portal, createNode({ kind: 'view', id: 'q', z: 'a1', center: { x: 0, y: 0 } }));
    expect(copy).toMatchObject({ id: 'q', scene: 'q' });

    const named = { ...createNode({ kind: 'note', id: 'c', z: 'a0', center: { x: 0, y: 0 } }), label: 'Mine' };
    const fresh = createNode({ kind: 'note', id: 'd', z: 'a1', center: { x: 0, y: 0 } });
    expect(cloneShape(named, fresh, [{ field: 'label', multiline: true }])).toMatchObject({ id: 'd', label: 'Note' });
  });

  test('flipping a link swaps its ends, keeps its markers and reverses a spline', ({ expect }) => {
    const link: Link = {
      kind: 'link',
      path: 'spline',
      id: 'l',
      z: 'a',
      source: { node: 'a', port: 'e1' },
      target: { point: { x: 100, y: 0 } },
      head: 'arrow',
      points: [
        { x: 10, y: 0 },
        { x: 20, y: 5 },
      ],
    };
    const flipped = flipLink(link);
    expect(flipped).toEqual({
      source: { point: { x: 100, y: 0 } },
      target: { node: 'a', port: 'e1' },
      points: [
        { x: 20, y: 5 },
        { x: 10, y: 0 },
      ],
    });
  });
});
