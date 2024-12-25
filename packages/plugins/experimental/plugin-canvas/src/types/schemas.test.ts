//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import {
  isPolygon,
  type EllipseShape,
  type FunctionShape,
  type PathShape,
  type RectangleShape,
  type Shape,
} from './schema';

describe('schema', () => {
  test('basic types', ({ expect }) => {
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
        type: 'path',
        path: 'M 0,0 L 160,0',
      } satisfies PathShape,
    ];

    const polygons = shapes.filter((s) => isPolygon(s)).map((s) => s.center);
    expect(polygons).to.have.length(2);
  });

  test('functions', ({ expect }) => {
    const shapes: Shape[] = [
      {
        id: 'function-1',
        type: 'function',
        center: { x: 0, y: 0 },
        size: { width: 80, height: 80 },
        properties: [],
      } satisfies FunctionShape,
    ];

    const polygons = shapes.filter((s) => isPolygon(s)).map((s) => s.center);
    expect(polygons).to.have.length(1);
  });
});
