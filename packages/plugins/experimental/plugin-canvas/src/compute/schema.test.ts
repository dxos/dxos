//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { create } from '@dxos/client/echo';
import { S } from '@dxos/echo-schema';
import { BaseGraphNode, Graph } from '@dxos/graph';

import { createSwitch, ComputeShape } from './shapes';
import { Polygon, Shape } from '../types';

describe('compute', () => {
  test('model', ({ expect }) => {
    // const model = CanvasGraphModel.create<ComputeShape>();
    const node = createSwitch({ id: 'x', center: { x: 0, y: 0 }, size: { width: 80, height: 80 } });
    console.log(JSON.stringify(node, null, 2));
    expect(S.is(ComputeShape)(node)).toBe(true);
    expect(S.is(Polygon)(node)).toBe(true);
    expect(S.is(Shape)(node)).toBe(true);
    expect(S.is(BaseGraphNode)(node)).toBe(true);

    const graph = create(Graph, { nodes: [], edges: [] });
    graph.nodes.push(node); // Throws.

    // model.createNode(node);
    // console.log(JSON.stringify(model, null, 2));
  });
});
