//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import {
  type ComputeImplementation,
  type Model,
  defineComputeNode,
  synchronizedComputeFunction,
} from '@dxos/conductor';
import { raise } from '@dxos/debug';
import { S, ObjectId } from '@dxos/echo-schema';
import { type GraphNode } from '@dxos/graph';
import { failedInvariant } from '@dxos/invariant';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from './compute-node';
import type { ComputeShape } from '../shapes';

// TODO(burdon): Just pass in type? Or can the shape specialize the node?
export const createComputeNode = (shape: GraphNode<ComputeShape>): GraphNode<Model.ComputeGraphNode> => {
  const factory =
    nodeFactory[shape.data.type ?? raise(new Error(`Shape type not registered: ${shape.data.type}`))] ??
    failedInvariant();

  return factory(shape);
};

// TODO(burdon): Don't need to create id here?
// TODO(burdon): Reconcile with ShapeRegistry.
const nodeFactory: Record<string, (shape: GraphNode<ComputeShape>) => GraphNode<Model.ComputeGraphNode>> = {
  beacon: () => ({
    id: ObjectId.random(),
    type: 'beacon', // TODO(burdon): Don't put type on both node and data.
    data: {
      type: 'beacon',
    },
  }),
  switch: () => ({
    id: ObjectId.random(),
    type: 'switch',
    data: {
      type: 'switch',
    },
  }),

  //
  // Boolean gates.
  //

  and: () => ({
    id: ObjectId.random(),
    type: 'and',
    data: {
      type: 'and',
    },
  }),
  or: () => ({
    id: ObjectId.random(),
    type: 'or',
    data: {
      type: 'or',
    },
  }),
  not: () => ({
    id: ObjectId.random(),
    type: 'not',
    data: {
      type: 'not',
    },
  }),
};

// TODO(burdon): Consolidate with factory above.
export const nodeDefs: Record<string, ComputeImplementation> = {
  switch: defineComputeNode({
    input: S.Struct({}),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
  }),
  beacon: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Boolean }),
    output: S.Struct({}),
  }),

  //
  // Boolean gates.
  //

  and: defineComputeNode({
    input: S.Struct({ a: S.Boolean, b: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    compute: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: a && b })),
  }),
  or: defineComputeNode({
    input: S.Struct({ a: S.Boolean, b: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    compute: synchronizedComputeFunction(({ a, b }) => Effect.succeed({ [DEFAULT_OUTPUT]: a || b })),
  }),
  not: defineComputeNode({
    input: S.Struct({ [DEFAULT_INPUT]: S.Boolean }),
    output: S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }),
    compute: synchronizedComputeFunction(({ [DEFAULT_INPUT]: input }) => Effect.succeed({ [DEFAULT_OUTPUT]: !input })),
  }),
};
