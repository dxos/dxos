//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

// import { type Shape } from './schema';
// import { isPolygon, isPath } from './shapes';
// import { createFunction } from '../compute';
// import { createEllipse, createRectangle, createPath } from '../shapes';

describe('schema', () => {
  test('basic types', ({ expect }) => {
    // const shapes: Shape[] = [];
    // shapes.push(createRectangle({ id: 'shape-1', center: { x: 0, y: 0 }, size: { width: 80, height: 80 } }));
    // shapes.push(createEllipse({ id: 'shape-2', center: { x: 0, y: 0 }, size: { width: 80, height: 80 } }));
    // shapes.push(createFunction({ id: 'shape-3', center: { x: 0, y: 0 } }));
    // shapes.push(
    //   createPath({
    //     id: 'shape-4',
    //     points: [
    //       { x: 0, y: 0 },
    //       { x: 0, y: 0 },
    //     ],
    //   }),
    // );
    // const polygons = shapes.filter((shape) => isPolygon(shape)).map((shape) => shape.center);
    // expect(polygons).to.have.length(3);
    // const paths = shapes.filter((shape) => isPath(shape)).map((shape) => shape.path);
    // expect(paths).to.have.length(1);
  });
});
