//
// Copyright 2025 DXOS.org
//

import { AST, S } from '@dxos/echo-schema';
import type { GraphEdge, GraphModel, GraphNode } from '@dxos/graph';
import { failedInvariant, invariant } from '@dxos/invariant';

import { pickProperty } from './ast';
import type { ComputeNode, ComputeEdge, ComputeMeta } from './schema';

/**
 * Structure derived from the compute graph.
 * Validates the edges and types.
 * Is used to run the computation.
 */
export type Topology = {
  inputNodeId: string;
  outputNodeId: string;
  inputSchema: S.Schema.AnyNoContext;
  outputSchema: S.Schema.AnyNoContext;
  // TODO(burdon): Map?
  nodes: TopologyNode[];
  // TODO(burdon): Part of topology?
  diagnostics: GraphDiagnostic[];
};

/**
 *
 */
export type TopologyNode = {
  id: string;
  graphNode: ComputeNode;
  meta: ComputeMeta;

  inputs: {
    name: string;
    schema: S.Schema.AnyNoContext;
    sourceNodeId?: string;
    sourceNodeOutput?: string;
  }[];

  outputs: {
    name: string;
    schema: S.Schema.AnyNoContext;
  }[];
};

export type GraphDiagnostic = {
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
};

export type CreateTopologyParams = {
  graph: GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>;
  inputNodeId: string;
  outputNodeId: string;
  computeMetaResolver: (node: ComputeNode) => Promise<ComputeMeta>;
};

/**
 *
 * @param graph
 * @param inputNodeId
 * @param outputNodeId
 * @param computeMetaResolver
 */
export const createTopology = async ({
  graph,
  inputNodeId,
  outputNodeId,
  computeMetaResolver,
}: CreateTopologyParams): Promise<Topology> => {
  const topology: Omit<Topology, 'inputSchema' | 'outputSchema'> = {
    inputNodeId,
    outputNodeId,
    nodes: [],
    diagnostics: [],
  };

  // Process nodes.
  for (const node of graph.getNodes()) {
    const meta = await computeMetaResolver(node.data);
    if (!meta) {
      throw new Error(`No meta for node: ${node.data.type}`);
    }

    topology.nodes.push({
      id: node.id,
      graphNode: node.data,
      meta,
      inputs: [],
      outputs: [],
    });
  }

  // Process edges.
  for (const edge of graph.getEdges()) {
    const sourceNode = topology.nodes.find((node) => node.id === edge.source);
    const targetNode = topology.nodes.find((node) => node.id === edge.target);
    if (sourceNode == null || targetNode == null) {
      continue; // TODO(burdon): Warn.
    }

    if (sourceNode.outputs.find((output) => output.name === edge.data.output) == null) {
      sourceNode.outputs.push({
        name: edge.data.output,
        schema: pickProperty(sourceNode.meta.output, edge.data.output),
      });
    }

    if (targetNode.inputs.find((input) => input.name === edge.data.input) == null) {
      targetNode.inputs.push({
        name: edge.data.input,
        schema: pickProperty(targetNode.meta.input, edge.data.input),
        sourceNodeId: sourceNode.id,
        sourceNodeOutput: edge.data.output,
      });
    }

    // TODO(dmaretskyi): Check assignability.

    // TODO(burdon): Set above? (i.e., let input = ...).
    const input = sourceNode.outputs.find((output) => output.name === edge.data.output);
    invariant(input);
    const output = targetNode.inputs.find((input) => input.name === edge.data.input);
    invariant(output);

    // TODO(burdon): Output first?
    if (AST.isNeverKeyword(output.schema.ast)) {
      topology.diagnostics.push({
        severity: 'error',
        edgeId: edge.id,
        message: 'Output does not exist on node.',
      });
    }

    if (AST.isNeverKeyword(input.schema.ast)) {
      topology.diagnostics.push({
        severity: 'error',
        edgeId: edge.id,
        message: 'Input does not exist on node.',
      });
    }
  }

  const inputNode = topology.nodes.find((node) => node.id === inputNodeId) ?? failedInvariant();
  const inputSchema = S.Struct(
    Object.fromEntries(inputNode.outputs.map((output) => [output.name, output.schema] as const)),
  );

  const outputNode = topology.nodes.find((node) => node.id === outputNodeId) ?? failedInvariant();
  const outputSchema = S.Struct(
    Object.fromEntries(outputNode.inputs.map((input) => [input.name, input.schema] as const)),
  );

  return {
    ...topology,
    inputSchema,
    outputSchema,
  };
};
