//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_EXTENT, boundsFromPoints, cellsIntersecting, hitTest, sceneBounds } from './hit.ts';
import { type Scene } from './types.ts';

const scene: Scene = {
  id: 's',
  cells: {
    a: { kind: 'rect', id: 'a', z: 'M', center: { x: 100, y: 100 }, size: { width: 100, height: 100 } },
    b: { kind: 'rect', id: 'b', z: 'V', center: { x: 150, y: 100 }, size: { width: 100, height: 100 } },
    t: { kind: 'text', id: 't', z: 'F', center: { x: 500, y: 500 }, size: { width: 50, height: 20 }, text: 'x' },
    l: { kind: 'link', id: 'l', z: 'A', source: { cell: 'a' }, target: { cell: 'b' } },
  },
};

describe('hit', () => {
  test('hitTest returns the topmost cell under the point', ({ expect }) => {
    // Overlap of a and b: b has the higher z.
    expect(hitTest(scene, { x: 140, y: 100 })?.id).toBe('b');
    expect(hitTest(scene, { x: 60, y: 100 })?.id).toBe('a');
    expect(hitTest(scene, { x: 900, y: 900 })).toBeUndefined();
  });

  test('hitTest margin reaches just outside a cell', ({ expect }) => {
    expect(hitTest(scene, { x: 205, y: 100 })).toBeUndefined();
    expect(hitTest(scene, { x: 205, y: 100 }, 8)?.id).toBe('b');
  });

  test('cellsIntersecting uses intersection, not containment', ({ expect }) => {
    const ids = cellsIntersecting(scene, boundsFromPoints({ x: 190, y: 90 }, { x: 210, y: 110 })).map(({ id }) => id);
    expect(ids).toEqual(['b']);
    expect(cellsIntersecting(scene, boundsFromPoints({ x: 0, y: 0 }, { x: 600, y: 600 })).length).toBe(3);
  });

  test('sceneBounds is the padded union of placed cells grown to the grid, or the default extent', ({ expect }) => {
    expect(sceneBounds(scene, 10, 1)).toEqual({ x: 40, y: 40, width: 495, height: 480 });
    expect(sceneBounds(scene, 10)).toEqual({ x: 0, y: 0, width: 576, height: 576 });
    expect(sceneBounds({ id: 'empty', cells: {} })).toEqual(DEFAULT_EXTENT);
  });
});
