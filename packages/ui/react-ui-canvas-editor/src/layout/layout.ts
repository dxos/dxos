//
// Copyright 2024 DXOS.org
//

import { Graph as NaturalGraph, type PlainObject } from '@antv/graphlib';
import {
  CircularLayout,
  type CircularLayoutOptions,
  type D3ForceLayoutOptions,
  ForceLayout,
  type ForceLayoutOptions,
  GridLayout,
  type GridLayoutOptions,
  RadialLayout,
  type RadialLayoutOptions,
} from '@antv/layout';
import defaultsDeep from 'lodash.defaultsdeep';

import { type Graph, type GraphModel } from '@dxos/graph';
import { type Dimension } from '@dxos/react-ui-canvas';
import { getDeep } from '@dxos/util';

import { CanvasGraphModel, type Polygon } from '../types';

import { type Intersection } from './util';

// TODO(burdon): Custom UML layout heuristics:
//  - Layout longest chain on horizontal.
//  - Inherits always goes up.

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

export const doLayout = async (
  data: GraphModel,
  options: Partial<LayoutOptions> = defaultLayoutOptions,
): Promise<CanvasGraphModel> => {
  const graph = CanvasGraphModel.create();
  const opt = defaultsDeep({}, options, defaultLayoutOptions);

  const defaultOptions: Intersection<[D3ForceLayoutOptions, GridLayoutOptions, RadialLayoutOptions]> = {
    center: [0, 0],
    width: opt.gridSize * 16,
    height: opt.gridSize * 16,
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
      const data: Polygon = {
        id: node.id,
        type: 'rectangle',
        text: label,
        center,
        size: { ...opt.shapeSize },
        // TODO(burdon): Object.
        // data: node.data,
      };

      graph.addNode(data);
    }
  }

  for (const { id, source, target } of edges) {
    graph.addEdge({ id: id as string, source: source as string, target: target as string });
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
    // https://github.com/antvis/layout/blob/v5/packages/layout/README.md#Force
    case 'force':
      return new ForceLayout({
        ...options,
        // nodeStrength: 1000,
        // edgeStrength: 2000,
        // collideStrength: 0.5,
      });
    // https://github.com/antvis/layout/blob/v5/packages/layout/README.md#Circular
    case 'circular':
      return new CircularLayout({
        ...options,
      });
    // https://github.com/antvis/layout/blob/v5/packages/layout/README.md#Radial
    case 'radial':
      return new RadialLayout({
        ...options,
        nodeSpacing: nodeSize * 2,
        unitRadius: nodeSize * 2,
      });
    // https://github.com/antvis/layout/blob/v5/packages/layout/README.md#Grid
    case 'grid':
    default:
      return new GridLayout(options);
  }
};

// TODO(burdon): Preserve existing position with Shape adapter.
const toLayoutGraph = ({ nodes, edges }: Graph): NaturalGraph<PlainObject, PlainObject> =>
  new NaturalGraph<PlainObject, PlainObject>({
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
