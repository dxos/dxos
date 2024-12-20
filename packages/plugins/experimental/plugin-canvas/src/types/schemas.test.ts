//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { S } from '@dxos/echo-schema';

import { PolygonShape, type EllipseShape, type LineShape, type RectangleShape, type Shape } from './schema';

// TODO(burdon): 1. Port polymorphic types to components.
// TODO(burdon): 2. Map graph to layout. (Value add)
// TODO(burdon): 3. Drag from toolbar. (Show ECHO updates in JSON tree; value add).

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

    const draggable = shapes.filter((s) => S.is(PolygonShape)(s)).map((s) => s.center);
    expect(draggable).to.have.length(2);
  });
});
