//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as GraphModel from '@dxos/graph/GraphModel';
import * as GraphNode from '@dxos/graph/GraphNode';
import { CanvasBoard, CanvasGraphModel } from '@dxos/react-ui-canvas-editor';

import { ComputeShape, createReducer, createSwitch } from './shapes/index.ts';

describe('compute', () => {
  test('a reducer keeps the id it is created with', ({ expect }) => {
    const reducer = createReducer({ id: 'reducer-1', center: { x: 0, y: 0 } });
    expect(reducer.id).toBe('reducer-1');
  });

  test('model', ({ expect }) => {
    const model = CanvasGraphModel.create<ComputeShape>();
    const node = createSwitch({ id: 'x', center: { x: 0, y: 0 }, size: { width: 80, height: 80 } });
    console.log(JSON.stringify(node, null, 2));
    expect(Schema.is(ComputeShape)(node)).toBe(true);
    expect(Schema.is(CanvasBoard.Shape)(node)).toBe(true);
    expect(Schema.is(GraphNode.GraphNode)(node)).toBe(true);

    const graph: GraphModel.AnyData = { nodes: [], edges: [] };
    graph.nodes.push(node);

    model.createNode(node);
    console.log(JSON.stringify(model, null, 2));
  });
});
