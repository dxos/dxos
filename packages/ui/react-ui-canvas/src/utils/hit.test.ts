//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Scene } from '../model/types.ts';
import { DEFAULT_EXTENT, boundsFromPoints, hitTest, nodesIntersecting, sceneBounds } from './hit.ts';

const scene: Scene = {
  id: 's',
  nodes: {
    a: { type: 'rect', id: 'a', z: 'M', center: { x: 100, y: 100 }, size: { width: 100, height: 100 } },
    b: { type: 'ellipse', id: 'b', z: 'V', center: { x: 150, y: 100 }, rx: 50, ry: 50 },
    t: { type: 'text', id: 't', z: 'F', center: { x: 500, y: 500 }, size: { width: 50, height: 20 }, text: 'x' },
  },
  links: {
    l: { type: 'line', id: 'l', z: 'A', source: { node: 'a' }, target: { node: 'b' } },
  },
};

describe('hit', () => {
  test('hitTest returns the topmost node under the point', ({ expect }) => {
    // Overlap of a and b: b has the higher z.
    expect(hitTest(scene, { x: 140, y: 100 })?.id).toBe('b');
    expect(hitTest(scene, { x: 60, y: 100 })?.id).toBe('a');
    expect(hitTest(scene, { x: 900, y: 900 })).toBeUndefined();
  });

  test('hitTest margin reaches just outside a node', ({ expect }) => {
    expect(hitTest(scene, { x: 205, y: 100 })).toBeUndefined();
    expect(hitTest(scene, { x: 205, y: 100 }, 8)?.id).toBe('b');
  });

  test('nodesIntersecting uses intersection, not containment', ({ expect }) => {
    const ids = nodesIntersecting(scene, boundsFromPoints({ x: 190, y: 90 }, { x: 210, y: 110 })).map(({ id }) => id);
    expect(ids).toEqual(['b']);
    expect(nodesIntersecting(scene, boundsFromPoints({ x: 0, y: 0 }, { x: 600, y: 600 })).length).toBe(3);
  });

  test('sceneBounds is the padded union of nodes grown to the grid, or the default extent', ({ expect }) => {
    expect(sceneBounds(scene, 10, 1)).toEqual({ x: 40, y: 40, width: 495, height: 480 });
    expect(sceneBounds(scene, 10)).toEqual({ x: 0, y: 0, width: 576, height: 576 });
    expect(sceneBounds({ id: 'empty', nodes: {}, links: {} })).toEqual(DEFAULT_EXTENT);
  });
});
