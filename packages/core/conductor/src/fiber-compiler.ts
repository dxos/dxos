//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { AST, S } from '@dxos/echo-schema';
import type { GraphEdge, GraphModel, GraphNode } from '@dxos/graph';
import { failedInvariant, invariant } from '@dxos/invariant';

import { pickProperty } from './ast';
import { EventLogger } from './event-logger';
import type { ComputeNode, ComputeEdge, ComputeImplementation, ComputeMeta, ComputeRequirements } from './schema';

export type ValidateParams = {
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
// TODO(burdon): Remove? Just wraps createTopology?
export const validate = async ({
  graph,
  inputNodeId,
  outputNodeId,
  computeMetaResolver,
}: ValidateParams): Promise<{ meta: ComputeMeta; diagnostics: GraphDiagnostic[] }> => {
  const topology = await createTopology({ graph, inputNodeId, outputNodeId, computeMetaResolver });
  return {
    meta: {
      input: topology.inputSchema,
      output: topology.outputSchema,
    },
    diagnostics: topology.diagnostics,
  };
};

export type CompileParams = {
  graph: GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>;

  /**
   * Id of the entrypoint node.
   */
  inputNodeId: string;

  /**
   * Id of the output node.
   */
  outputNodeId: string;

  computeResolver: (node: ComputeNode) => Promise<ComputeImplementation>;
};

/**
 * @returns A new compute implementation that takes input from the specific entrypoint node
 * and returns the output from the specific output node computing all intermediate nodes.
 */
export const compile = async ({
  graph,
  inputNodeId,
  outputNodeId,
  computeResolver,
}: CompileParams): Promise<{ computation: ComputeImplementation; diagnostics: GraphDiagnostic[] }> => {
  const topology = await createTopology({
    graph,
    inputNodeId,
    outputNodeId,
    computeMetaResolver: async (node) => {
      const compute = await computeResolver(node);
      return compute.meta;
    },
  });

  const computeCache = new Map<string, Effect.Effect<any, any, ComputeRequirements>>();

  const computeInputs = (node: TopologyNode): Effect.Effect<any, Error, ComputeRequirements> => {
    return Effect.gen(function* () {
      const inputValues = yield* Effect.forEach(node.inputs, (input) => {
        const sourceNode = topology.nodes.find((node) => node.id === input.sourceNodeId) ?? failedInvariant();
        return computeNode(sourceNode).pipe(
          Effect.map((value) => [input.name, value[input.sourceNodeOutput!]] as const),
        );
      }).pipe(Effect.map((inputs) => Object.fromEntries(inputs)));

      return inputValues;
    });
  };

  const computeNode = (node: TopologyNode): Effect.Effect<any, any, ComputeRequirements> => {
    if (computeCache.has(node.id)) {
      return computeCache.get(node.id)!;
    }

    const result = Effect.gen(function* () {
      const inputValues = yield* computeInputs(node);
      // TODO(dmaretskyi): Consider resolving the node implementation at the start of the computation.
      const nodeSpec = yield* Effect.promise(() => computeResolver(node.graphNode));
      if (nodeSpec.compute == null) {
        yield* Effect.fail(new Error(`No compute function for node type: ${node.graphNode.type}`));
        return;
      }

      const logger = yield* EventLogger;
      logger.log({
        type: 'begin-compute',
        nodeId: node.id,
        inputs: inputValues,
      });

      const sanitizedInputs = yield* S.decode(node.meta.input)(inputValues);
      const output = yield* nodeSpec.compute(sanitizedInputs).pipe(
        Effect.provideService(EventLogger, {
          log: logger.log,
          nodeId: node.id,
        }),
      );
      const decodedOutput = yield* S.decode(node.meta.output)(output);

      logger.log({
        type: 'end-compute',
        nodeId: node.id,
        outputs: decodedOutput,
      });
      return decodedOutput;
    });

    computeCache.set(node.id, result);
    return result;
  };

  return {
    computation: {
      meta: {
        input: topology.inputSchema,
        output: topology.outputSchema,
      },

      compute: (input) => {
        return Effect.gen(function* () {
          const logger = yield* EventLogger;

          // TODO(dmaretskyi): At the start we log a synthetic end-compute event for the input node to capture it's inputs.
          logger.log({
            type: 'end-compute',
            nodeId: inputNodeId,
            outputs: input,
          });
          computeCache.set(topology.inputNodeId, Effect.succeed(input));
          const outputNode = topology.nodes.find((node) => node.id === topology.outputNodeId) ?? failedInvariant();

          const outputs = yield* computeInputs(outputNode);

          // Log the output node inputs.
          logger.log({
            type: 'begin-compute',
            nodeId: outputNodeId,
            inputs: outputs,
          });

          return outputs;
        });
      },
    },
    diagnostics: topology.diagnostics,
  };
};

type CreateTopologyParams = {
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
const createTopology = async ({
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

/**
 * Structure derived from the compute graph.
 * Validates the edges and types.
 * Is used to run the computation.
 */
type Topology = {
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
type TopologyNode = {
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

type GraphDiagnostic = {
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
};
