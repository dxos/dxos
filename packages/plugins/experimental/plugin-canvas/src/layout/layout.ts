//
// Copyright 2024 DXOS.org
//

import { Graph as NativeGraph, type PlainObject } from '@antv/graphlib';
import {
  type D3ForceLayoutOptions,
  ForceLayout,
  type ForceLayoutOptions,
  GridLayout,
  type GridLayoutOptions,
  RadialLayout,
  type RadialLayoutOptions,
  CircularLayout,
  type CircularLayoutOptions,
} from '@antv/layout';
import defaultsDeep from 'lodash.defaultsdeep';

import { type Dimension } from '@dxos/react-ui-canvas';
import { getDeep } from '@dxos/util';

import { type Graph, GraphModel, type Node } from '../graph';
import { type Shape } from '../types';

// TODO(burdon): Util.
export type Intersection<Types extends readonly unknown[]> = Types extends [infer First, ...infer Rest]
  ? First & Intersection<Rest>
  : unknown;

export type LayoutOptions = {
  layout: LayoutKind;
  gridSize: number;
  nodeSize: number;
  shapeSize: Dimension;
};

export const defaultLayoutOptions: LayoutOptions = {
  layout: 'grid',
  gridSize: 32,
  nodeSize: 128,
  shapeSize: { width: 128, height: 64 },
};

// TODO(burdon): N should be an referenceable object.
export const doLayout = async <N extends object>(
  data: GraphModel<Node<N>>,
  options: Partial<LayoutOptions> = defaultLayoutOptions,
): Promise<GraphModel<Node<Shape>>> => {
  const graph = new GraphModel<Node<Shape>>();
  const opt = defaultsDeep({}, options, defaultLayoutOptions);

  const defaultOptions: Intersection<[D3ForceLayoutOptions, GridLayoutOptions, RadialLayoutOptions]> = {
    center: [0, 0],
    width: opt.gridSize * 20,
    height: opt.gridSize * 20,
    nodeSize: opt.nodeSize,
    nodeSpacing: opt.nodeSize / 2,
    preventOverlap: true,
  };

  const layout = createLayout(opt.layout ?? defaultLayoutOptions.layout, defaultOptions);
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
      const center = { x, y };
      graph.addNode({
        id: node.id,
        data: {
          id: node.id,
          type: 'rectangle',
          text: label,
          center,
          size: { ...opt.shapeSize },
          // TODO(burdon): Object.
          // data: node.data,
        },
      });
    }
  }

  for (const edge of edges) {
    graph.addEdge(edge);
  }

  return graph;
};

export type LayoutKind = 'force' | 'circular' | 'radial' | 'grid';

export const LAYOUTS: LayoutKind[] = ['force', 'circular', 'radial', 'grid'];

// https://github.com/antvis/layout/blob/v5/packages/layout/README.md
type CommonLayoutOptions = Intersection<
  [ForceLayoutOptions, CircularLayoutOptions, RadialLayoutOptions, GridLayoutOptions]
>;

const createLayout = (type: LayoutKind, options: CommonLayoutOptions) => {
  const nodeSize = options.nodeSize as number;
  switch (type) {
    case 'force':
      return new ForceLayout({
        ...options,
        collideStrength: 0.8,
      });
    case 'circular':
      return new CircularLayout({
        ...options,
      });
    case 'radial':
      return new RadialLayout({
        ...options,
        unitRadius: nodeSize * 2,
      });
    case 'grid':
    default:
      return new GridLayout(options);
  }
};

// TODO(burdon): Preserve existing position with Shape adapter.
const toLayoutGraph = ({ nodes, edges }: Graph): NativeGraph<PlainObject, PlainObject> => {
  return new NativeGraph<PlainObject, PlainObject>({
    nodes: nodes.map((node) => ({
      id: node.id,
      data: {
        x: getDeep(node.data, ['center', 'x']) ?? 0,
        y: getDeep(node.data, ['center', 'y']) ?? 0,
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: {},
    })),
  });
};
