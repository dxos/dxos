//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { S } from '@dxos/echo-schema';
import type { GraphEdge, GraphModel, GraphNode } from '@dxos/graph';
import { failedInvariant, invariant } from '@dxos/invariant';

import { raise } from '@dxos/debug';
import type {
  ComputeEdge,
  ComputeGraph,
  ComputeImplementation,
  ComputeMeta,
  ComputeNode,
  ComputeRequirements,
  OutputBag,
} from './schema';
import { EventLogger } from './services';
import { createTopology, type GraphDiagnostic, type Topology } from './topology';

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
  const executor = new GraphExecutor({ computeMetaResolver });
  await executor.load(graph);
  return {
    meta: {
      input: executor.getInputSchema(inputNodeId),
      output: executor.getOutputSchema(outputNodeId),
    },
    diagnostics: executor.getDiagnostics(),
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
  const executor = new GraphExecutor({ computeNodeResolver: computeResolver });
  await executor.load(graph);

  return {
    computation: {
      meta: {
        input: executor.getInputSchema(inputNodeId),
        output: executor.getOutputSchema(outputNodeId),
      },

      compute: (input) => {
        return Effect.gen(function* () {
          const instance = executor.clone();
          const logger = yield* EventLogger;

          // TODO(dmaretskyi): At the start we log a synthetic end-compute event for the input node to capture it's inputs.
          logger.log({ type: 'end-compute', nodeId: inputNodeId, outputs: input });
          instance.setOutputs(inputNodeId, input);
          const outputs = yield* instance.computeInputs(outputNodeId);

          // Log the output node inputs.
          logger.log({ type: 'begin-compute', nodeId: outputNodeId, inputs: outputs });
          return outputs;
        });
      },
    },

    diagnostics: executor.getDiagnostics(),
  };
};

type GraphExecutorParams = {
  computeMetaResolver?: (node: ComputeNode) => Promise<ComputeMeta>;
  computeNodeResolver?: (node: ComputeNode) => Promise<ComputeImplementation>;
};

export class GraphExecutor {
  private readonly _computeMetaResolver: (node: ComputeNode) => Promise<ComputeMeta>;
  private readonly _computeNodeResolver: (node: ComputeNode) => Promise<ComputeImplementation>;
  private _topology?: Topology = undefined;
  private _computeCache = new Map<string, Effect.Effect<any, any, ComputeRequirements>>();

  constructor(params: GraphExecutorParams) {
    this._computeNodeResolver =
      params.computeNodeResolver ?? (() => raise(new Error('Compute node resolver not provided')));
    this._computeMetaResolver =
      params.computeMetaResolver ??
      (params.computeNodeResolver
        ? async (node) => {
            const compute = await params.computeNodeResolver!(node);
            return compute.meta;
          }
        : () => raise(new Error('Either compute node resolver or compute meta resolver must be provided')));
  }

  /**
   * Clone the graph and the topology but discard the runtime state.
   */
  clone() {
    const executor = new GraphExecutor({
      computeMetaResolver: this._computeMetaResolver,
      computeNodeResolver: this._computeNodeResolver,
    });
    executor._topology = this._topology;
    return executor;
  }

  async load(graph: ComputeGraph) {
    this._computeCache.clear();
    this._topology = await createTopology({
      graph,
      computeMetaResolver: this._computeMetaResolver,
    });
  }

  getDiagnostics(): GraphDiagnostic[] {
    return this._topology?.diagnostics ?? [];
  }

  /**
   * Get resolved schema for inputs of the node.
   * The schema will depend on other nodes this node is connected to.
   */
  getInputSchema(nodeId: string): S.Schema.AnyNoContext {
    invariant(this._topology, 'Graph not loaded');
    const node = this._topology!.nodes.find((node) => node.id === nodeId) ?? failedInvariant();
    return S.Struct(Object.fromEntries(node.outputs.map((output) => [output.name, output.schema] as const)));
  }

  /**
   * Get resolved schema for outputs of the node.
   * The schema will depend on other nodes this node is connected to.
   */
  getOutputSchema(nodeId: string): S.Schema.AnyNoContext {
    invariant(this._topology, 'Graph not loaded');
    const node = this._topology!.nodes.find((node) => node.id === nodeId) ?? failedInvariant();
    return S.Struct(Object.fromEntries(node.inputs.map((input) => [input.name, input.schema] as const)));
  }

  /**
   * Set outputs for a node.
   * When values are polled, this node will not be computed.
   */
  setOutputs(nodeId: string, outputs: OutputBag<any>) {
    this._computeCache.set(nodeId, Effect.succeed(outputs));
  }

  setInputs(nodeId: string, inputs: Record<string, any>) {
    throw new Error('Not implemented');
  }

  /**
   * Compute inputs for a node using a pull-based computation.
   */
  computeInputs(nodeId: string): Effect.Effect<OutputBag<any>, Error, ComputeRequirements> {
    invariant(this._topology, 'Graph not loaded');
    return Effect.gen(this, function* () {
      const node = this._topology!.nodes.find((node) => node.id === nodeId) ?? failedInvariant();
      return yield* Effect.forEach(node.inputs, (input) => {
        const sourceNode = this._topology!.nodes.find((node) => node.id === input.sourceNodeId) ?? failedInvariant();
        return this.computeOutputs(sourceNode.id).pipe(
          Effect.map((value) => [input.name, value[input.sourceNodeOutput!]] as const),
        );
      }).pipe(Effect.map((inputs) => Object.fromEntries(inputs)));
    });
  }

  /**
   * Compute outputs for a node using a pull-based computation.
   */
  computeOutputs(nodeId: string): Effect.Effect<any, any, ComputeRequirements> {
    const result = Effect.gen(this, function* () {
      invariant(this._topology, 'Graph not loaded');
      if (this._computeCache.has(nodeId)) {
        return yield* this._computeCache.get(nodeId)!;
      }

      const node = this._topology!.nodes.find((node) => node.id === nodeId) ?? failedInvariant();

      const compute = Effect.gen(this, function* () {
        const inputValuesBag = yield* this.computeInputs(nodeId);
        const inputValues = yield* unwrapOutputBag(inputValuesBag);
        // TODO(dmaretskyi): Consider resolving the node implementation at the start of the computation.
        const nodeSpec = yield* Effect.promise(() => this._computeNodeResolver(node.graphNode));
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
      this._computeCache.set(node.id, cachedCompute);
      return yield* cachedCompute;
    });

    return result;
  }
}

const unwrapOutputBag = <T>(output: OutputBag<T>): Effect.Effect<T, Error, ComputeRequirements> => {
  return Effect.gen(function* () {
    const res = {} as any;
    for (const [key, value] of Object.entries(output)) {
      res[key] = Effect.isEffect(value) ? yield* value : value;
    }
    return res;
  }) as any;
};
