//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { S } from '@dxos/echo-schema';
import type { GraphEdge, GraphModel, GraphNode } from '@dxos/graph';
import { failedInvariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { getDebugName } from '@dxos/util';

import type {
  ComputeNode,
  ComputeEdge,
  ComputeImplementation,
  ComputeMeta,
  ComputeRequirements,
  OutputBag,
} from './schema';
import { EventLogger } from './services';
import { createTopology, type GraphDiagnostic, type TopologyNode } from './topology';

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

  const computeInputs = (node: TopologyNode): Effect.Effect<OutputBag<any>, Error, ComputeRequirements> => {
    return Effect.gen(function* () {
      return yield* Effect.forEach(node.inputs, (input) => {
        const sourceNode = topology.nodes.find((node) => node.id === input.sourceNodeId) ?? failedInvariant();
        return computeNode(sourceNode).pipe(
          Effect.map((value) => [input.name, value[input.sourceNodeOutput!]] as const),
        );
      }).pipe(Effect.map((inputs) => Object.fromEntries(inputs)));
    });
  };

  const unwrapOutputBag = <T>(output: OutputBag<T>): Effect.Effect<T, Error, ComputeRequirements> => {
    return Effect.gen(function* () {
      const res = {} as any;
      for (const [key, value] of Object.entries(output)) {
        res[key] = Effect.isEffect(value) ? yield* value : value;
      }
      return res;
    }) as any;
  };

  const computeNode = (node: TopologyNode): Effect.Effect<any, any, ComputeRequirements> => {
    const result = Effect.gen(function* () {
      if (computeCache.has(node.id)) {
        return yield* computeCache.get(node.id)!;
      }

      const compute = Effect.gen(function* () {
        const inputValuesBag = yield* computeInputs(node);
        const inputValues = yield* unwrapOutputBag(inputValuesBag);
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
        // log.info('output', { output });
        // if ('text' in output) {
        //   log.info('text in fiber', { text: getDebugName(output.text) });
        // }

        // const decodedOutput = yield* S.decode(node.meta.output)(output);

        logger.log({
          type: 'end-compute',
          nodeId: node.id,
          outputs: output,
        });
        return output;
      });

      const cachedCompute = yield* compute.pipe(Effect.cached);
      computeCache.set(node.id, cachedCompute);
      return yield* cachedCompute;
    });

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
          logger.log({ type: 'end-compute', nodeId: inputNodeId, outputs: input });
          computeCache.set(topology.inputNodeId, Effect.succeed(input));
          const outputNode = topology.nodes.find((node) => node.id === topology.outputNodeId) ?? failedInvariant();
          const outputs = yield* computeInputs(outputNode);

          // Log the output node inputs.
          logger.log({ type: 'begin-compute', nodeId: outputNodeId, inputs: outputs });
          return outputs;
        });
      },
    },

    diagnostics: topology.diagnostics,
  };
};
