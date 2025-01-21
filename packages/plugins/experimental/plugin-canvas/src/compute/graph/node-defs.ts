//
// Copyright 2025 DXOS.org
//

import { type ComputeNode, type Executable, type NodeType, registry } from '@dxos/conductor';
import { raise } from '@dxos/debug';
import { ObjectId } from '@dxos/echo-schema';
import { type GraphNode } from '@dxos/graph';
import { invariant } from '@dxos/invariant';

import { type ComputeShape, type ConstantShape } from '../shapes';

export const resolveComputeNode = async (node: ComputeNode): Promise<Executable> => {
  const impl = registry[node.type as NodeType];
  invariant(impl, `Unknown node type: ${node.type}`);
  return impl;
};

export const isValidComputeNode = (type: string): boolean => {
  return nodeFactory[type as NodeType] !== undefined;
};

export const createComputeNode = (shape: GraphNode<ComputeShape>): GraphNode<ComputeNode> => {
  const type = shape.data.type ?? raise(new Error('Type not specified'));
  const factory = nodeFactory[type as NodeType] ?? raise(new Error(`Unknown shape type: ${type}`));
  return factory(shape);
};

const nodeFactory: Record<NodeType, (shape: GraphNode<ComputeShape>) => GraphNode<ComputeNode>> = {
  ['and' as const]: () => createNode('and'),
  ['append' as const]: () => createNode('append'),
  ['audio' as const]: () => createNode('audio'),
  ['beacon' as const]: () => createNode('beacon'),
  ['chat' as const]: () => createNode('chat'),
  ['constant' as const]: (shape) => createNode('constant', { constant: (shape.data as ConstantShape).value }),
  ['database' as const]: () => createNode('database'),
  ['gpt' as const]: () => createNode('gpt'),
  ['gpt-realtime' as const]: () => createNode('gpt-realtime'),
  ['if' as const]: () => createNode('if'),
  ['if-else' as const]: () => createNode('if-else'),
  ['function' as const]: () => createNode('function'),
  ['json' as const]: () => createNode('view'),
  ['list' as const]: () => createNode('list'),
  ['map' as const]: () => createNode('map'),
  ['not' as const]: () => createNode('not'),
  ['or' as const]: () => createNode('or'),
  ['reducer' as const]: () => createNode('reducer'),
  ['scope' as const]: () => createNode('scope'),
  ['switch' as const]: () => createNode('switch'),
  ['text' as const]: () => createNode('text'),
  ['text-to-image' as const]: () => createNode('text-to-image'),
  ['thread' as const]: () => createNode('thread'),
  ['timer' as const]: () => createNode('timer'),
  ['trigger' as const]: () => createNode('trigger'),
  ['view' as const]: () => createNode('view'),
};

const createNode = (type: string, props?: Partial<ComputeNode>) => ({
  // TODO(burdon): Don't need to create id here?
  id: ObjectId.random(),
  type,
  data: {
    // TODO(burdon): Don't put type on both node and data.
    type,
    ...props,
  },
});
