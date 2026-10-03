//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type BuiltinNode, MAJOR_GRID, type Scene } from '../model/types.ts';
import { DEFAULT_EXTENT, boundsFromPoints, contentBounds, hitTest, nodesIntersecting, sceneBounds } from './hit.ts';

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

  test('the default extent is centred on the origin and lands on the major grid', ({ expect }) => {
    // A scene is laid out around (0, 0); an extent anchored at the origin instead would put its centre
    // — and so the initial fit — well below and right of the content.
    expect(DEFAULT_EXTENT.x + DEFAULT_EXTENT.width / 2).toBe(0);
    expect(DEFAULT_EXTENT.y + DEFAULT_EXTENT.height / 2).toBe(0);
    expect(Math.abs(DEFAULT_EXTENT.x % MAJOR_GRID)).toBe(0);
    expect(Math.abs(DEFAULT_EXTENT.y % MAJOR_GRID)).toBe(0);
  });

  test('sceneBounds grows the default extent by the padded union of the nodes', ({ expect }) => {
    // Content inside the default extent leaves it as it is, whatever the padding or grid.
    const near: Scene = { id: 'near', nodes: { a: nodes.a }, links: {} };
    expect(sceneBounds(near, 10, 1)).toEqual(DEFAULT_EXTENT);
    expect(sceneBounds(near, 10)).toEqual(DEFAULT_EXTENT);
    expect(sceneBounds({ id: 'empty', nodes: {}, links: {} })).toEqual(DEFAULT_EXTENT);
    // A node beyond it grows the frame that way, and the default still holds the other three sides.
    const far: BuiltinNode = {
      type: 'rect',
      id: 'far',
      z: 'Z',
      center: { x: 2000, y: -400 },
      size: { width: 100, height: 100 },
    };
    expect(sceneBounds({ ...near, nodes: { ...near.nodes, far } })).toEqual({
      x: -832,
      y: -576,
      width: 3008,
      height: 1088,
    });
  });

  test('contentBounds frames the content alone, and the floor only when there is none', ({ expect }) => {
    // The same scene seen two ways: on its own it gets the editing surface, in a portal its own content.
    const near: Scene = { id: 'near', nodes: { a: nodes.a }, links: {} };
    expect(sceneBounds(near)).toEqual(DEFAULT_EXTENT);
    // The node's 50..150 box, padded by a major cell and grown to the grid.
    expect(contentBounds(near)).toEqual({ x: -64, y: -64, width: 320, height: 320 });
    // Nothing to frame, so the floor is the frame rather than a degenerate box.
    expect(contentBounds({ id: 'empty', nodes: {}, links: {} })).toEqual(DEFAULT_EXTENT);
  });
});
