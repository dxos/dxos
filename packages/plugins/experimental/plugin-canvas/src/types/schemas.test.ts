//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { isPolygon, isPath, type Shape } from './schema';
import { createEllipse, createPath, createRectangle, createFunction } from '../shapes';

describe('schema', () => {
  test('basic types', ({ expect }) => {
    const shapes: Shape[] = [];
    shapes.push(createRectangle({ id: 'shape-1', center: { x: 0, y: 0 }, size: { width: 80, height: 80 } }));
    shapes.push(createEllipse({ id: 'shape-2', center: { x: 0, y: 0 }, size: { width: 80, height: 80 } }));
    shapes.push(createFunction({ id: 'shape-3', center: { x: 0, y: 0 }, size: { width: 80, height: 80 } }));
    shapes.push(createPath({ id: 'shape-4', points: [] }));

    const polygons = shapes.filter((s) => isPolygon(s)).map((s) => s.center);
    expect(polygons).to.have.length(3);

    const paths = shapes.filter((s) => isPath(s)).map((s) => s.path);
    expect(paths).to.have.length(1);
  });
});
