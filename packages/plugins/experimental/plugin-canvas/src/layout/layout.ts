//
// Copyright 2024 DXOS.org
//

import { Graph as NativeGraph, type PlainObject } from '@antv/graphlib';
import { type D3ForceLayoutOptions, GridLayout, type GridLayoutOptions, type RadialLayoutOptions } from '@antv/layout';

import { type Dimension, getBounds } from './geometry';
import { type BaseShape, type Graph, GraphModel, type Node } from '../graph';

// TODO(burdon): Util.
export type Intersection<Types extends readonly unknown[]> = Types extends [infer First, ...infer Rest]
  ? First & Intersection<Rest>
  : unknown;

export type LayoutOptions = {
  gridSize: number;
  nodeSize: number;
  shapeSize: Dimension;
};

export const defaultLayoutOptions: LayoutOptions = {
  gridSize: 32,
  nodeSize: 128,
  shapeSize: { width: 128, height: 64 },
};

// TODO(burdon): Builder.
export const doLayout = async <N extends object>(
  data: GraphModel<Node<N>>,
  { gridSize, nodeSize, shapeSize }: LayoutOptions = defaultLayoutOptions,
): Promise<GraphModel<Node<BaseShape<N>>>> => {
  const graph = new GraphModel<Node<BaseShape<N>>>();

  const defaultOptions: Intersection<[D3ForceLayoutOptions, GridLayoutOptions, RadialLayoutOptions]> = {
    width: gridSize * 20,
    height: gridSize * 20,
    linkDistance: gridSize * 2,
    nodeSize,
    nodeSpacing: nodeSize,
    preventOverlap: true,
  };

  const layout = new GridLayout({
    ...defaultOptions,
  });

  const { nodes, edges } = await layout.execute(toLayoutGraph(data.graph));

  for (const {
    id,
    data: { x, y },
  } of nodes) {
    const node = data.getNode(id as string);
    if (node) {
      // TODO(burdon): Get label from schema annotation.
      // const label = node.data.text,
      const label = (node.data as any).name;

      graph.addNode({
        id: node.id,
        data: {
          id: node.id,
          type: 'rect',
          text: label,
          pos: { x, y },
          size: shapeSize,
          rect: getBounds({ x, y }, shapeSize),
          data: node.data,
        },
      });
    }
  }

  for (const edge of edges) {
    graph.addEdge(edge);
  }

  return graph;
};

const toLayoutGraph = ({ nodes, edges }: Graph): NativeGraph<PlainObject, PlainObject> => {
  return new NativeGraph<PlainObject, PlainObject>({
    nodes: nodes.map((node) => ({ id: node.id, data: node.data })),
    edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, data: edge.data })),
  });
};
