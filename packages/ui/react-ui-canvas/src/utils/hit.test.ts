//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type BuiltinNode, type Scene } from '../model/types.ts';
import { boundsFromPoints, contentBounds, hitTest, nodesIntersecting } from './hit.ts';

const nodes: Record<string, BuiltinNode> = {
  a: { type: 'rect', id: 'a', z: 'M', center: { x: 100, y: 100 }, size: { width: 100, height: 100 } },
  b: { type: 'ellipse', id: 'b', z: 'V', center: { x: 150, y: 100 }, size: { width: 100, height: 100 } },
  t: { type: 'note', id: 't', z: 'F', center: { x: 500, y: 500 }, size: { width: 50, height: 20 }, text: 'x' },
};

const scene: Scene = {
  id: 's',
  nodes,
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

  test('contentBounds frames the content alone, and nothing for an empty scene', ({ expect }) => {
    const near: Scene = { id: 'near', nodes: { a: nodes.a }, links: {} };
    // The node's 50..150 box, padded by a major cell and grown to the grid.
    expect(contentBounds(near)).toEqual({ x: -64, y: -64, width: 320, height: 320 });
    expect(contentBounds({ id: 'empty', nodes: {}, links: {} })).toBeUndefined();
  });
});
