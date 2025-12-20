//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { JsonSchema, Obj, Type } from '@dxos/echo';
import { Function } from '@dxos/functions';
import { Graph } from '@dxos/graph';

export const ComputeValueType = Schema.Literal('string', 'number', 'boolean', 'object');

export type ComputeValueType = Schema.Schema.Type<typeof ComputeValueType>;

/**
 * GraphNode.
 */
export const ComputeNode = Schema.extend(
  Graph.BaseNode,

  /**
   * NOTE: We have a mixin of properties for different node types for simplicity, rather than a discriminated union.
   */
  // TODO(burdon): Split out into different types.
  Schema.Struct({
    /** For template nodes. */
    // TODO(dmaretskyi): Compute at runtime: don't persist.
    inputSchema: Schema.optional(JsonSchema.JsonSchema),

    outputSchema: Schema.optional(JsonSchema.JsonSchema),

    /** For composition nodes. */
    subgraph: Schema.optional(Schema.suspend((): Type.Ref<ComputeGraph> => Type.Ref(ComputeGraph))),

    /** For composition of function nodes. */
    function: Schema.optional(Type.Ref(Function.Function) as Type.Ref<Function.Function>),

    /**
     * For template nodes determines the type of the value.
     * We cannot rely on `typeof value` as for object nodes we want to store potentially broken JSON as text.
     * For valueType === 'object' we store the JSON as text in `value`.
     */
    valueType: Schema.optional(ComputeValueType),

    /** For constant and template nodes. */
    value: Schema.optional(Schema.Any),

    /**
     * For switch nodes.
     * @deprecated
     */
    // TODO(dmaretskyi): Reuse `value`.
    enabled: Schema.optional(Schema.Boolean),
  }),
).pipe(Schema.mutable);

export interface ComputeNode extends Schema.Schema.Type<typeof ComputeNode> {}

// TODO(dmaretskyi): To effect schema.
export type ComputeNodeMeta = {
  input: Schema.Schema.AnyNoContext;
  output: Schema.Schema.AnyNoContext;
};

/**
 * GraphEdge.
 */
export const ComputeEdge = Schema.extend(
  Graph.BaseEdge,
  Schema.Struct({
    /** Output property from source. */
    output: Schema.String,

    /** Input property to target. */
    input: Schema.String,
  }),
);

export interface ComputeEdge extends Schema.Schema.Type<typeof ComputeEdge> {}

/**
 * Persistent graph.
 */
export const ComputeGraph = Schema.Struct({
  // NOTE: Cast required as workaround for TS compiler bug.
  graph: Graph as Schema.Schema<Graph>,

  // Reference nodes.
  input: Schema.optional(Graph.BaseNode),
  output: Schema.optional(Graph.BaseNode),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/ComputeGraph',
    version: '0.1.0',
  }),
);

export interface ComputeGraph extends Schema.Schema.Type<typeof ComputeGraph> {}

export const isComputeGraph = Obj.instanceOf(ComputeGraph);
