//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { type EllipseShape, type LineShape, type RectangleShape, type Shape, isPolygon } from './schema';

describe('schema', () => {
  test('types', ({ expect }) => {
    const shapes: Shape[] = [
      {
        id: 'shape-1',
        type: 'rectangle',
        center: { x: 0, y: 0 },
        size: { width: 80, height: 80 },
      } satisfies RectangleShape,
      {
        id: 'shape-2',
        type: 'ellipse',
        center: { x: 160, y: 0 },
        size: { width: 80, height: 80 },
      } satisfies EllipseShape,
      {
        id: 'shape-3',
        type: 'line',
        path: 'M 0,0 L 160,0',
      } satisfies LineShape,
    ];

    const polygons = shapes.filter((s) => isPolygon(s)).map((s) => s.center);
    expect(polygons).to.have.length(2);
  });
});
