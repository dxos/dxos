//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { BaseGraphNode, type Graph } from '@dxos/graph';
import {
  CanvasGraphModel,
  Polygon,
  Shape,
  createEllipse,
  createPath,
  createRectangle,
  isPath,
  isPolygon,
} from '@dxos/react-ui-canvas-editor';

import { ComputeShape, createFunction, createSwitch } from './shapes';

describe('compute', () => {
  test('model', ({ expect }) => {
    const model = CanvasGraphModel.create<ComputeShape>();
    const node = createSwitch({ id: 'x', center: { x: 0, y: 0 }, size: { width: 80, height: 80 } });
    console.log(JSON.stringify(node, null, 2));
    expect(Schema.is(ComputeShape)(node)).toBe(true);
    expect(Schema.is(Polygon)(node)).toBe(true);
    expect(Schema.is(Shape)(node)).toBe(true);
    expect(Schema.is(BaseGraphNode)(node)).toBe(true);

    const graph: Graph = { nodes: [], edges: [] };
    graph.nodes.push(node);

    model.createNode(node);
    console.log(JSON.stringify(model, null, 2));
  });
});

describe('schema', () => {
  test('basic types', ({ expect }) => {
    const shapes: Shape[] = [];
    shapes.push(createRectangle({ id: 'shape-1', center: { x: 0, y: 0 }, size: { width: 80, height: 80 } }));
    shapes.push(createEllipse({ id: 'shape-2', center: { x: 0, y: 0 }, size: { width: 80, height: 80 } }));
    shapes.push(createFunction({ id: 'shape-3', center: { x: 0, y: 0 } }));
    shapes.push(
      createPath({
        id: 'shape-4',
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
      }),
    );

    const polygons = shapes.filter((shape) => isPolygon(shape)).map((shape) => shape.center);
    expect(polygons).to.have.length(3);

    const paths = shapes.filter((shape) => isPath(shape)).map((shape) => shape.path);
    expect(paths).to.have.length(1);
  });
});
