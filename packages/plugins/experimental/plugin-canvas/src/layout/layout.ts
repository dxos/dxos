//
// Copyright 2024 DXOS.org
//

import { Graph as NativeGraph, type PlainObject } from '@antv/graphlib';
import {
  D3ForceLayout,
  type D3ForceLayoutOptions,
  type GridLayoutOptions,
  type LayoutMapping,
  type RadialLayoutOptions,
} from '@antv/layout';

import { getRect } from './geometry';
import { type Graph, type GraphModel } from '../graph';

// TODO(burdon): Util.
export type Intersection<Types extends readonly unknown[]> = Types extends [infer First, ...infer Rest]
  ? First & Intersection<Rest>
  : unknown;

export const toLayoutGraph = ({ nodes, edges }: Graph): NativeGraph<PlainObject, PlainObject> => {
  return new NativeGraph<PlainObject, PlainObject>({
    nodes: nodes.map((node) => ({ id: node.id, data: node.data })),
    edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, data: edge.data })),
  });
};

export const updateLayout = (graph: GraphModel, { nodes }: LayoutMapping): GraphModel => {
  for (const {
    id,
    data: { x, y },
  } of nodes) {
    const node = graph.getNode(id as string);
    if (node) {
      node.data.pos = { x, y };
      node.data.rect = getRect(node.data.pos, node.data.size);
    }
  }

  return graph;
};

export const doLayout = async (graph: NativeGraph<PlainObject, PlainObject>) => {
  const grid = 32;
  const nodeSize = 64;
  const defaultOptions: Intersection<[D3ForceLayoutOptions, GridLayoutOptions, RadialLayoutOptions]> = {
    center: [0, 0],
    width: grid * 20,
    height: grid * 20,
    linkDistance: grid * 2,
    nodeSize,
    nodeSpacing: nodeSize,
    preventOverlap: true,
  };

  const layout = new D3ForceLayout({
    ...defaultOptions,
    nodeStrength: 0.3,
    collideStrength: 0.8,
  });

  return await layout.execute(graph);
};
