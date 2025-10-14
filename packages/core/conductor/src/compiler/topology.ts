//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { isArrayType } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type ComputeGraphModel, type ComputeMeta, type ComputeNode } from '../types';
import { pickProperty } from '../util';

/**
 * Structure derived from the compute graph.
 * Validates the edges and types.
 * Is used to run the computation.
 */
export type Topology = {
  // TODO(burdon): Map?
  nodes: TopologyNode[];

  // TODO(burdon): Part of topology?
  diagnostics: GraphDiagnostic[];
};

export enum InputKind {
  /**
   * This input must be bound to 0-1 outputs.
   * The value is passed as is.
   */
  Scalar = 'scalar',

  /**
   * This can be bound to 0-n outputs which are collected into an array.
   */
  Array = 'array',
}

export type TopologyNodeInput = {
  name: string;
  schema: Schema.Schema.AnyNoContext;

  /**
   * Defines the kind of input.
   */
  kind: InputKind;

  /**
   * Nodes that this input is bound to.
   * Should be 0-1 if this node is input is not a multiple input  .
   */
  sources: TopologyNodeConnector[];
};

/**
 * Specific connector on the topology graph: nodeId + property.
 */
export type TopologyNodeConnector = {
  nodeId: string;
  property: string;
};

type TopologyNodeOutput = {
  name: string;
  schema: Schema.Schema.AnyNoContext;
  /**
   * Nodes that this output is bound to.
   */
  boundTo: TopologyNodeConnector[];
};

export type TopologyNode = {
  id: string;
  graphNode: ComputeNode; // TODO(burdon): Rename computeNode.
  meta: ComputeMeta;
  inputs: TopologyNodeInput[];
  outputs: TopologyNodeOutput[];
};

export type GraphDiagnostic = {
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
  property?: string;
};

export type CreateTopologyParams = {
  graph: ComputeGraphModel;
  computeMetaResolver: (node: ComputeNode) => Promise<ComputeMeta>;
};

/**
 * Creates a topology from a compute graph by resolving node metadata and building input/output connections.
 * The topology represents the static structure and data flow of the graph.
 *
 * @param params.graph - The compute graph model to create topology from
 * @param params.computeMetaResolver - Function that resolves compute metadata for a given node
 * @returns A topology containing nodes with their inputs/outputs and any diagnostics
 */
export const createTopology = async ({ graph, computeMetaResolver }: CreateTopologyParams): Promise<Topology> => {
  const topology: Omit<Topology, 'inputSchema' | 'outputSchema'> = {
    nodes: [],
    diagnostics: [],
  };

  // Process nodes.
  for (const node of graph.nodes) {
    const meta = await computeMetaResolver(node);
    if (!meta) {
      throw new Error(`No meta for node: ${node.type}`);
    }

    topology.nodes.push({
      id: node.id,
      graphNode: node,
      meta,
      inputs: [],
      outputs: [],
    });
  }

  // Process edges.
  for (const edge of graph.edges) {
    const sourceNode = topology.nodes.find((node) => node.id === edge.source);
    const targetNode = topology.nodes.find((node) => node.id === edge.target);
    if (sourceNode == null || targetNode == null) {
      continue; // TODO(burdon): Warn.
    }

    if (sourceNode.outputs.find((output) => output.name === edge.output) == null) {
      const schema = pickProperty(sourceNode.meta.output, edge.output);
      if (SchemaAST.isNeverKeyword(schema.ast)) {
        // TODO(dmaretskyi): This should be a hard error.
        log.warn('output does not exist on node', {
          sourceNode: sourceNode.graphNode.type,
          output: edge.output,
          type: schema.ast,
          nodeOutputType: sourceNode.meta.output.ast,
        });
      }
      sourceNode.outputs.push({
        name: edge.output,
        schema,
        boundTo: [],
      });
    }

    if (targetNode.inputs.find((input) => input.name === edge.input) == null) {
      const schema = pickProperty(targetNode.meta.input, edge.input);
      if (SchemaAST.isNeverKeyword(schema.ast)) {
        // TODO(dmaretskyi): This should be a hard error.
        log.warn('input does not exist on node', {
          sourceNode: sourceNode.graphNode.type,
          output: edge.output,
          type: schema.ast,
          nodeOutputType: sourceNode.meta.output.ast,
        });
      }
      targetNode.inputs.push({
        name: edge.input,
        schema,
        kind: isArrayType(schema.ast) ? InputKind.Array : InputKind.Scalar,
        sources: [],
      });
    }

    // TODO(dmaretskyi): Check assignability.

    const output = sourceNode.outputs.find((output) => output.name === edge.output);
    invariant(output);
    const input = targetNode.inputs.find((input) => input.name === edge.input);
    invariant(input);

    output.boundTo.push({
      nodeId: targetNode.id,
      property: input.name,
    });
    if (input.sources.length >= 1 && input.kind === InputKind.Scalar) {
      topology.diagnostics.push({
        severity: 'error',
        edgeId: edge.id,
        nodeId: targetNode.id,
        property: input.name,
        message: 'input is scalar but has multiple sources',
      });
    }
    input.sources.push({ nodeId: sourceNode.id, property: edge.output });

    if (SchemaAST.isNeverKeyword(output.schema.ast)) {
      log.warn('output does not exist on node:', { source: targetNode.graphNode.type, target: output.name });
      topology.diagnostics.push({
        severity: 'error',
        edgeId: edge.id,
        message: `output does not exist on node: [${sourceNode.graphNode.type}] -> ${output.name}`,
      });
    }

    if (SchemaAST.isNeverKeyword(input.schema.ast)) {
      log.warn('input does not exist on node:', { source: input.name, target: targetNode.graphNode.type });
      topology.diagnostics.push({
        severity: 'error',
        edgeId: edge.id,
        message: `input does not exist on node: ${input.name} -> [${targetNode.graphNode.type}]`,
      });
    }
  }

  return topology;
};
