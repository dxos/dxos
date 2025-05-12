//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { JsonSchemaType, Ref, type Ref$, TypedObject } from '@dxos/echo-schema';
import { FunctionType } from '@dxos/functions/types';
import { BaseGraphEdge, BaseGraphNode, Graph } from '@dxos/graph';

export const ComputeValueType = Schema.Literal('string', 'number', 'boolean', 'object');
export type ComputeValueType = Schema.Schema.Type<typeof ComputeValueType>;

/**
 * GraphNode.
 */
export const ComputeNode = Schema.extend(
  BaseGraphNode,

  /**
   * NOTE: We have a mixin of properties for different node types for simplicity, rather than a discriminated union.
   */
  // TODO(burdon): Split out into different types.
  Schema.Struct({
    /** For template nodes. */
    // TODO(dmaretskyi): Compute at runtime -- don't persist.
    inputSchema: Schema.optional(JsonSchemaType),
    outputSchema: Schema.optional(JsonSchemaType),

    /** For composition nodes. */
    subgraph: Schema.optional(Schema.suspend((): Ref$<ComputeGraph> => Ref(ComputeGraph))),

    /** For composition of function nodes. */
    function: Schema.optional(Ref(FunctionType) as Ref$<FunctionType>),

    /**
     * For template nodes determines the type of the value.
     * We cannot rely on `typeof value` as for object nodes we want to store potentially broken JSON as text.
     * For valueType === 'object' we store the JSON as text in `value`.
     */
    valueType: Schema.optional(ComputeValueType),

    /** For constant and template nodes. */
    value: Schema.optional(Schema.Any),

    /** For switch nodes. */
    // TODO(dmaretskyi): Reuse `value`.
    enabled: Schema.optional(Schema.Boolean),
  }),
).pipe(Schema.mutable);

export type ComputeNode = Schema.Schema.Type<typeof ComputeNode>;

/**
 * GraphEdge.
 */
export const ComputeEdge = Schema.extend(
  BaseGraphEdge,

  Schema.Struct({
    /** Output property from source. */
    output: Schema.String,

    /** Input property to target. */
    input: Schema.String,
  }),
);

export type ComputeEdge = Schema.Schema.Type<typeof ComputeEdge>;

/**
 * Persistent graph.
 */
export class ComputeGraph extends TypedObject({
  typename: 'dxos.org/type/ComputeGraph',
  version: '0.1.0',
})({
  // NOTE: Cast required as workaround for TS compiler bug.
  graph: Graph as Schema.Schema<Graph>,

  // Reference nodes.
  input: Schema.optional(BaseGraphNode),
  output: Schema.optional(BaseGraphNode),
}) {}

export const isComputeGraph = Schema.is(ComputeGraph);
