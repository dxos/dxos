//
// Copyright 2025 DXOS.org
//

import {
  type ComputeNode,
  type Executable,
  NODE_INPUT,
  NODE_OUTPUT,
  type NodeType,
  getTemplateInputSchema,
  registry,
} from '@dxos/conductor';
import { raise } from '@dxos/debug';
import { JsonSchema, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { type ComputeShape, type ConstantShape, type TemplateShape } from '../shapes';

export const resolveComputeNode = async (node: ComputeNode): Promise<Executable> => {
  const impl = registry[node.type as NodeType];
  invariant(impl, `Unknown node type: ${node.type}`);
  return impl;
};

export const isValidComputeNode = (type: string): boolean => {
  return nodeFactory[type as NodeType] !== undefined;
};

export const createComputeNode = (shape: ComputeShape): ComputeNode => {
  const type = shape.type ?? raise(new Error('Type not specified'));
  const factory = nodeFactory[type as NodeType] ?? raise(new Error(`Unknown shape type: ${type}`));
  return factory(shape);
};

const nodeFactory: Record<NodeType | 'trigger', (shape: ComputeShape) => ComputeNode> = {
  // System.
  [NODE_INPUT]: () => createNode(NODE_INPUT),
  [NODE_OUTPUT]: () => createNode(NODE_OUTPUT),

  // Extensions.
  'text-to-image': () => createNode('text-to-image'), // TODO(burdon): Rename ai-impage-tool
  and: () => createNode('and'),
  append: () => createNode('append'),
  audio: () => createNode('audio'),
  beacon: () => createNode('beacon'),
  chat: () => createNode('chat'),
  constant: (shape) =>
    createNode('constant', {
      value: (shape as ConstantShape).value,
    }),
  'make-queue': () => createNode('make-queue'),
  database: () => createNode('database'),
  gpt: () => createNode('gpt'),
  'gpt-realtime': () => createNode('gpt-realtime'),
  if: () => createNode('if'),
  'if-else': () => createNode('if-else'),
  function: () => createNode('function'),
  json: () => createNode('json'),
  'json-transform': () => createNode('json-transform'),
  not: () => createNode('not'),
  or: () => createNode('or'),
  queue: () => createNode('queue'),
  rng: () => createNode('rng'),
  reducer: () => createNode('reducer'),
  scope: () => createNode('scope'),
  surface: () => createNode('surface'),
  switch: () => createNode('switch'),
  template: (shape) => {
    const node = createNode('template', { valueType: (shape as TemplateShape).valueType, value: shape.text });
    node.inputSchema = JsonSchema.toJsonSchema(getTemplateInputSchema(node));
    return node;
  },
  text: () => createNode('text'),
  thread: () => createNode('thread'),
  trigger: () => createNode(NODE_INPUT),
};

const createNode = (type: string, props?: Partial<ComputeNode>): ComputeNode => ({
  id: Obj.ID.random(),
  type,
  ...props,
});
