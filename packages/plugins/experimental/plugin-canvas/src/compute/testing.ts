//
// Copyright 2024 DXOS.org
//

import { GraphModel, type GraphNode, createEdgeId } from '@dxos/graph';

import { createAnd, createFunction, createSwitch, createTimer } from './shapes';
import type { Shape } from '../types';

const nodes = [
  createFunction({ id: 'a', center: { x: -128, y: 0 } }),
  createFunction({ id: 'b', center: { x: 128, y: 0 } }),
  createTimer({ id: 'c', center: { x: -320, y: 0 } }),
  createAnd({ id: 'd', center: { x: -128, y: -256 } }),
  createSwitch({ id: 'e', center: { x: -320, y: -256 } }),
];

const edges = [
  { source: 'c', target: 'a', data: { property: 'value' } },
  { source: 'e', target: 'd', data: { property: 'a' } },
  { source: 'd', target: 'b', data: { property: 'value' } },
  { source: 'a', target: 'b', data: { property: 'value' } },
  { source: 'b', target: 'd', data: { property: 'b' } },
];

export const testGraph = new GraphModel<GraphNode<Shape>>({
  nodes: nodes.map((data) => ({ id: data.id, data })),
  edges: edges.map(({ source, target, data }) => ({
    id: createEdgeId({ source, target, relation: 'computes' }),
    source,
    target,
    data,
  })),
});
