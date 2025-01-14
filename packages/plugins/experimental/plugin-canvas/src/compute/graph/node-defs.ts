//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import {
  type ComputeGraphNode,
  type ComputeNode,
  type Executable,
  defineComputeNode,
  synchronizedComputeFunction,
} from '@dxos/conductor';
import { raise } from '@dxos/debug';
import { S, ObjectId } from '@dxos/echo-schema';
import { type GraphNode } from '@dxos/graph';
import { failedInvariant, invariant } from '@dxos/invariant';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from './compute-node';
import { type ComputeShape } from '../shapes';

type NodeType = 'switch' | 'text' | 'beacon' | 'and' | 'or' | 'not' | 'if' | 'if-else';

// TODO(burdon): Just pass in type? Or can the shape specialize the node?
export const createComputeNode = (shape: GraphNode<ComputeShape>): GraphNode<ComputeGraphNode> => {
  const type = shape.data.type as NodeType;
  const factory = nodeFactory[type ?? raise(new Error(`Unknown shape type: ${type}`))] ?? failedInvariant();
  return factory(shape);
};

const createNode = (type: string) => ({
  // TODO(burdon): Don't need to create id here?
  id: ObjectId.random(),
  type, // TODO(burdon): Don't put type on both node and data.
  data: {
    type,
  },
});

// TODO(burdon): Reconcile with ShapeRegistry.
const nodeFactory: Record<NodeType, (shape: GraphNode<ComputeShape>) => GraphNode<ComputeGraphNode>> = {
  // Controls.
  ['switch' as const]: () => createNode('switch'),
  ['text' as const]: () => createNode('text'),

  // Views.
  ['beacon' as const]: () => createNode('beacon'),

  // Boolean ops.
  ['and' as const]: () => createNode('and'),
  ['or' as const]: () => createNode('or'),
  ['not' as const]: () => createNode('not'),

  // Logic ops.
  ['if' as const]: () => createNode('if'),
  ['if-else' as const]: () => createNode('if-else'),
};

export const resolveComputeNode = async (node: ComputeNode): Promise<Executable> => {
  const impl = nodeDefs[node.type as NodeType];
  invariant(impl, `Unknown node type: ${node.type}`);
  return impl;
};

const nodeDefs: Record<NodeType, Executable> = {
  // Controls.
  ['switch' as const]: defineComputeNode({
    input: S.Struct({}),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
  }),
  ['text' as const]: defineComputeNode({
    input: S.Struct({}),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.String }),
  }),

  // Views.
  ['beacon' as const]: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Boolean }),
    output: S.Struct({}),
  }),

  // Boolean ops.
  ['and' as const]: defineComputeNode({
    input: S.Struct({ a: S.Boolean, b: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    exec: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: a && b })),
  }),
  ['or' as const]: defineComputeNode({
    input: S.Struct({ a: S.Boolean, b: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    exec: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: a || b })),
  }),
  ['not' as const]: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    exec: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) => Effect.succeed({ [DEFAULT_OUTPUT]: !input })),
  }),

  // Logic ops.
  ['if' as const]: defineComputeNode({
    input: S.Struct({ condition: S.Boolean, value: S.Any }),
    output: S.Struct({ true: S.optional(S.Any), false: S.optional(S.Any) }),
    exec: synchronizedComputeFunction(({ condition, value }) =>
      Effect.succeed(condition ? { true: value } : { false: value }),
    ),
  }),
  ['if-else' as const]: defineComputeNode({
    input: S.Struct({ condition: S.Boolean, true: S.Any, false: S.Any }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Any }),
    exec: synchronizedComputeFunction(({ condition, true: trueValue, false: falseValue }) =>
      Effect.succeed({ [DEFAULT_OUTPUT]: condition ? trueValue : falseValue }),
    ),
  }),
};
