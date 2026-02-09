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
  ['text-to-image' as const]: () => createNode('text-to-image'), // TODO(burdon): Rename ai-impage-tool
  ['and' as const]: () => createNode('and'),
  ['append' as const]: () => createNode('append'),
  ['audio' as const]: () => createNode('audio'),
  ['beacon' as const]: () => createNode('beacon'),
  ['chat' as const]: () => createNode('chat'),
  ['constant' as const]: (shape) =>
    createNode('constant', {
      value: (shape as ConstantShape).value,
    }),
  ['make-queue' as const]: () => createNode('make-queue'),
  ['database' as const]: () => createNode('database'),
  ['gpt' as const]: () => createNode('gpt'),
  ['gpt-realtime' as const]: () => createNode('gpt-realtime'),
  ['if' as const]: () => createNode('if'),
  ['if-else' as const]: () => createNode('if-else'),
  ['function' as const]: () => createNode('function'),
  ['json' as const]: () => createNode('json'),
  ['json-transform' as const]: () => createNode('json-transform'),
  ['not' as const]: () => createNode('not'),
  ['or' as const]: () => createNode('or'),
  ['queue' as const]: () => createNode('queue'),
  ['rng' as const]: () => createNode('rng'),
  ['reducer' as const]: () => createNode('reducer'),
  ['scope' as const]: () => createNode('scope'),
  ['surface' as const]: () => createNode('surface'),
  ['switch' as const]: () => createNode('switch'),
  ['template' as const]: (shape) => {
    const node = createNode('template', { valueType: (shape as TemplateShape).valueType, value: shape.text });
    node.inputSchema = JsonSchema.toJsonSchema(getTemplateInputSchema(node));
    return node;
  },
  ['text' as const]: () => createNode('text'),
  ['thread' as const]: () => createNode('thread'),
  ['trigger' as const]: () => createNode(NODE_INPUT),
};

const createNode = (type: string, props?: Partial<ComputeNode>): ComputeNode => ({
  id: Obj.ID.random(),
  type,
  ...props,
});
