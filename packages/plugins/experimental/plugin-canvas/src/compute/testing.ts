//
// Copyright 2024 DXOS.org
//

import { type Point } from '@antv/layout';

import { GraphModel, type GraphNode, type GraphEdge, createEdgeId } from '@dxos/graph';

import { type ComputeNode, DEFAULT_INPUT, DEFAULT_OUTPUT, StateMachine } from './graph';
import {
  createAnd,
  createBeacon,
  createChat,
  createCounter,
  createDatabase,
  createFunction,
  createGpt,
  createList,
  createOr,
  createSwitch,
  createText,
  createThread,
  createTimer,
} from './shapes';
import { type BaseComputeShape, type ComputeShape } from './shapes/defs';
import { pointMultiply } from '../layout';
import type { Connection, Shape } from '../types';
import { createView } from './shapes/View';

// TODO(burdon): Factor out.
const pos = (p: Point) => pointMultiply(p, 32);

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

const ARTIFACTS_SYSTEM_PROMPT = `
You are able to create artifacts which are a persisted piece of data.
To create an artifact, print the text you want to put into the artifact in <artifact> tags.
When a user asks you to create something, decide whether it should be an artifact.
Prefer artifacts for tables, lists, and other data structures.
`;

export const createTest3 = ({
  db = false,
  cot = false,
  artifact = false,
  history = false,
}: {
  db?: boolean;
  cot?: boolean;
  artifact?: boolean;
  history?: boolean;
} = {}) => {
  const nodes: Shape[] = [
    createChat({ id: 'a', center: pos({ x: -12, y: 0 }) }),
    ...(artifact ? [createText({ id: 'h', center: pos({ x: -12, y: -6 }), text: ARTIFACTS_SYSTEM_PROMPT })] : []),
    createGpt({ id: 'b', center: pos({ x: 0, y: 0 }) }),
    createThread({ id: 'c', center: pos({ x: 16, y: -4 }) }),
    createCounter({ id: 'd', center: pos({ x: 8, y: 6 }) }),
    ...(db ? [createDatabase({ id: 'e', center: pos({ x: -10, y: 6 }) })] : []),
    ...(cot ? [createList({ id: 'f', center: pos({ x: 0, y: 14 }) })] : []),
    ...(artifact ? [createView({ id: 'g', center: pos({ x: 0, y: -12 }) })] : []),
  ];

  const edges: Omit<GraphEdge<Connection>, 'id'>[] = [
    { source: 'a', target: 'b', data: { input: 'prompt', output: DEFAULT_OUTPUT } },
    ...(artifact ? [{ source: 'h', target: 'b', data: { output: DEFAULT_OUTPUT, input: 'systemPrompt' } }] : []),
    { source: 'b', target: 'c', data: { output: 'result', input: DEFAULT_INPUT } },
    { source: 'b', target: 'd', data: { output: 'tokens', input: DEFAULT_INPUT } },
    ...(history ? [{ source: 'c', target: 'b', data: { output: DEFAULT_OUTPUT, input: 'history' } }] : []),
    ...(db ? [{ source: 'e', target: 'b', data: { input: 'tools', output: DEFAULT_OUTPUT } }] : []),
    ...(cot ? [{ source: 'b', target: 'f', data: { output: 'cot', input: DEFAULT_INPUT } }] : []),
    ...(artifact ? [{ source: 'b', target: 'g', data: { output: 'artifact', input: DEFAULT_INPUT } }] : []),
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

export const createMachine = (graph?: GraphModel<GraphNode<Shape>, GraphEdge<Connection>>) => {
  const machine = new StateMachine(undefined);

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

  return { machine, graph };
};
