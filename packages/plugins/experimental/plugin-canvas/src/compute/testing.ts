//
// Copyright 2024 DXOS.org
//

import { GraphModel, type GraphNode, type GraphEdge, createEdgeId } from '@dxos/graph';

import { type ComputeNode, StateMachine } from './graph';
import {
  createAnd,
  createBeacon,
  createChat,
  createCounter,
  createFunction,
  createGpt,
  createList,
  createOr,
  createSwitch,
  createTimer,
} from './shapes';
import { type BaseComputeShape, type ComputeShape } from './shapes/defs';
import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '../shapes';
import type { Connection, Shape } from '../types';

// TODO(burdon): GraphBuilder.

export const createTest1 = () => {
  const nodes: Shape[] = [
    createSwitch({ id: 'a1', center: { x: -256, y: -256 } }),
    createSwitch({ id: 'a2', center: { x: -256, y: -92 } }),
    createSwitch({ id: 'a3', center: { x: -256, y: 92 } }),
    createAnd({ id: 'b1', center: { x: 0, y: -192 } }),
    createOr({ id: 'c1', center: { x: 256, y: 0 } }),
    createBeacon({ id: 'd1', center: { x: 512, y: 0 } }),
  ];

  const edges = [
    { source: 'a1', target: 'b1', data: { input: 'a' } },
    { source: 'a2', target: 'b1', data: { input: 'b' } },
    { source: 'b1', target: 'c1', data: { input: 'a' } },
    { source: 'a3', target: 'c1', data: { input: 'b' } },
    { source: 'c1', target: 'd1', data: {} },
  ];

  return new GraphModel<GraphNode<Shape>, GraphEdge<Connection>>({
    nodes: nodes.map((data) => ({ id: data.id, data })),
    edges: edges.map(({ source, target, data }) => ({
      id: createEdgeId({ source, target, relation: 'invokes' }),
      source,
      target,
      data,
    })),
  });
};

export const createTest2 = () => {
  const nodes: Shape[] = [
    createTimer({ id: 'a', center: { x: -256, y: 0 } }),
    createFunction({ id: 'b', center: { x: 0, y: 0 } }),
    createAnd({ id: 'c', center: { x: 0, y: -256 } }),
    createBeacon({ id: 'd', center: { x: 256, y: -256 } }),
    createSwitch({ id: 'e', center: { x: -256, y: -256 } }),
  ];

  const edges = [
    { source: 'a', target: 'b', data: { input: 'input' } },
    { source: 'e', target: 'c', data: { input: 'a' } },
    { source: 'b', target: 'c', data: { input: 'b', output: 'result' } },
    { source: 'c', target: 'd' },
  ];

  return new GraphModel<GraphNode<Shape>, GraphEdge<Connection>>({
    nodes: nodes.map((data) => ({ id: data.id, data })),
    edges: edges.map(({ source, target, data }) => ({
      id: createEdgeId({ source, target, relation: 'invokes' }),
      source,
      target,
      data,
    })),
  });
};

export const createTest3 = () => {
  const nodes: Shape[] = [
    createChat({ id: 'a', center: { x: -384, y: 0 } }),
    createGpt({ id: 'b', center: { x: 0, y: 0 } }),
    createList({ id: 'c', center: { x: 384, y: -128 } }),
    createCounter({ id: 'd', center: { x: 384, y: 256 } }),
  ];

  const edges = [
    { source: 'a', target: 'b', data: { input: 'prompt', output: DEFAULT_OUTPUT } },
    { source: 'b', target: 'c', data: { output: 'result', input: DEFAULT_INPUT } },
    { source: 'b', target: 'd', data: { output: 'tokens' } },
  ];

  return new GraphModel<GraphNode<Shape>, GraphEdge<Connection>>({
    nodes: nodes.map((data) => ({ id: data.id, data })),
    edges: edges.map(({ source, target, data }) => ({
      id: createEdgeId({ source, target, relation: 'invokes' }),
      source,
      target,
      data,
    })),
  });
};

// TODO(burdon): Check output anchor id is set from functions.
export const createComputeGraph = (graph?: GraphModel<GraphNode<Shape>, GraphEdge<Connection>>) => {
  const machine = new StateMachine();

  // TODO(burdon): Factor out mapping (reconcile with Editor.stories).
  if (graph) {
    for (const node of graph.nodes) {
      const data = node.data as ComputeShape<BaseComputeShape, ComputeNode<any, any>>;
      machine.graph.addNode({ id: data.id, data: data.node });
    }
    for (const edge of graph.edges) {
      const data = (edge.data ?? {}) as Connection;
      const { input, output } = data;
      machine.graph.addEdge({ id: edge.id, source: edge.source, target: edge.target, data: { input, output } });
    }
  }

  return { graph, machine };
};
