//
// Copyright 2025 DXOS.org
//

import { Effect, Layer, Scope } from 'effect';

import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';
import { failedInvariant, invariant } from '@dxos/invariant';

import { createTopology, type GraphDiagnostic, type Topology, type TopologyNode } from './topology';
import { EventLogger, GptService } from '../services';
import {
  type ComputeGraphModel,
  type ComputeEffect,
  type Executable,
  type ComputeMeta,
  type ComputeNode,
  type ComputeRequirements,
  NotExecuted,
  type ValueBag,
  isNotExecuted,
  isValueBag,
  makeValueBag,
} from '../types';

export type ValidateParams = {
  graph: ComputeGraphModel;
  inputNodeId: string;
  outputNodeId: string;
  computeMetaResolver: (node: ComputeNode) => Promise<ComputeMeta>;
};

export type ValidateResult = {
  meta: ComputeMeta;
  diagnostics: GraphDiagnostic[];
};

/**
 *
 * @param graph
 * @param inputNodeId
 * @param outputNodeId
 * @param computeMetaResolver
 */
export const validate = async ({
  graph,
  inputNodeId,
  outputNodeId,
  computeMetaResolver,
}: ValidateParams): Promise<ValidateResult> => {
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
  graph: ComputeGraphModel;

  /**
   * Id of the entrypoint node.
   */
  inputNodeId: string;

  /**
   * Id of the output node.
   */
  outputNodeId: string;

  /**
   *
   */
  computeResolver: (node: ComputeNode) => Promise<Executable>;
};

export type CompileResult = {
  executable: Executable;
  diagnostics: GraphDiagnostic[];
};

/**
 * @returns A compiled function that takes input from the specific entrypoint node
 * and returns the output from the specific output node computing all intermediate nodes.
 */
export const compile = async ({
  graph,
  inputNodeId,
  outputNodeId,
  computeResolver,
}: CompileParams): Promise<CompileResult> => {
  const executor = new GraphExecutor({ computeNodeResolver: computeResolver });
  await executor.load(graph);

  return {
    executable: {
      meta: {
        input: executor.getInputSchema(inputNodeId),
        output: executor.getOutputSchema(outputNodeId),
      },

      exec: (input) => {
        return Effect.gen(function* () {
          const instance = executor.clone();
          const logger = yield* EventLogger;

          // TODO(dmaretskyi): At the start we log a synthetic end-compute event for the input node to capture it's inputs.
          logger.log({ type: 'end-compute', nodeId: inputNodeId, outputs: Object.keys(input.values) });
          instance.setOutputs(inputNodeId, input);
          const outputs = yield* instance.computeInputs(outputNodeId);

          // Log the output node inputs.
          logger.log({ type: 'begin-compute', nodeId: outputNodeId, inputs: Object.keys(outputs.values) });
          return outputs;
        }).pipe(Effect.withSpan('compile/compute'));
      },
    },

    diagnostics: executor.getDiagnostics(),
  };
};

type GraphExecutorParams = {
  computeMetaResolver?: (node: ComputeNode) => Promise<ComputeMeta>;
  computeNodeResolver?: (node: ComputeNode) => Promise<Executable>;
};

/**
 *
 */
export class GraphExecutor {
  private readonly _computeMetaResolver: (node: ComputeNode) => Promise<ComputeMeta>;
  private readonly _computeNodeResolver: (node: ComputeNode) => Promise<Executable>;
  private _topology?: Topology = undefined;
  private _computeCache = new Map<string, Effect.Effect<ValueBag<any>, Error | NotExecuted, ComputeRequirements>>();

  constructor({ computeMetaResolver, computeNodeResolver }: GraphExecutorParams) {
    this._computeNodeResolver = computeNodeResolver ?? (() => raise(new Error('Compute node resolver not provided')));
    this._computeMetaResolver =
      computeMetaResolver ??
      (computeNodeResolver
        ? async (node) => {
            const compute = await computeNodeResolver!(node);
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

  async load(graph: ComputeGraphModel) {
    this._computeCache.clear();
    this._topology = await createTopology({
      graph,
      computeMetaResolver: this._computeMetaResolver,
    });
  }

  getDiagnostics(): GraphDiagnostic[] {
    return this._topology?.diagnostics ?? [];
  }

  getMeta(nodeId: string): ComputeMeta {
    invariant(this._topology, 'Graph not loaded');
    const node = this._topology!.nodes.find((node) => node.id === nodeId) ?? failedInvariant();
    return node.meta;
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
  setOutputs(nodeId: string, outputs: ValueBag<any>) {
    invariant(isValueBag(outputs), 'Outputs must be a value bag');
    this._computeCache.set(nodeId, Effect.succeed(outputs));
  }

  setInputs(nodeId: string, inputs: ValueBag<any>) {
    invariant(isValueBag(inputs), 'Inputs must be a value bag');
    this._computeCache.set(nodeId, Effect.succeed(inputs));
  }

  /**
   * Compute inputs for a node using a pull-based computation.
   */
  computeInputs(nodeId: string): ComputeEffect<ValueBag<any>> {
    invariant(this._topology, 'Graph not loaded');
    return Effect.gen(this, function* () {
      const node = this._topology!.nodes.find((node) => node.id === nodeId) ?? failedInvariant();

      const layer = Layer.mergeAll(
        Layer.succeed(Scope.Scope, yield* Scope.Scope),
        Layer.succeed(EventLogger, yield* EventLogger),
        Layer.succeed(GptService, yield* GptService),
      );

      const entries = node.inputs.map(
        (input) =>
          [
            input.name,
            Effect.gen(this, function* () {
              const sourceNode =
                this._topology!.nodes.find((node) => node.id === input.sourceNodeId) ?? failedInvariant();
              const output = yield* this.computeOutput(sourceNode.id, input.sourceNodeOutput!);

              const logger = yield* EventLogger;
              logger.log({
                type: 'compute-input',
                nodeId,
                property: input.name,
                value: output,
              });

              return output;
            }).pipe(
              Effect.withSpan('compute-input', { attributes: { nodeId, inputName: input.name } }),
              Effect.provide(layer),
            ),
          ] as const,
      );
      return makeValueBag(Object.fromEntries(entries));
    }).pipe(Effect.withSpan('compute-inputs', { attributes: { nodeId } }));
  }

  computeOutput(nodeId: string, prop: string): Effect.Effect<any, Error | NotExecuted, ComputeRequirements> {
    return Effect.gen(this, function* () {
      const output = yield* this.computeOutputs(nodeId);
      invariant(output.type === 'bag', 'Output must be a value bag');
      if (isNotExecuted(output)) {
        return yield* Effect.fail(NotExecuted);
      }
      const value = yield* output.values[prop];

      const logger = yield* EventLogger;
      logger.log({
        type: 'compute-output',
        nodeId,
        property: prop,
        value,
      });

      return value;
    }).pipe(Effect.withSpan('compute-output', { attributes: { nodeId, prop } }));
  }

  /**
   * Compute outputs for a node using a pull-based computation.
   */
  computeOutputs(nodeId: string): Effect.Effect<ValueBag<any>, Error | NotExecuted, ComputeRequirements> {
    return Effect.gen(this, function* () {
      invariant(this._topology, 'Graph not loaded');
      if (this._computeCache.has(nodeId)) {
        const result = yield* this._computeCache.get(nodeId)!;
        try {
          invariant(result.type === 'bag', 'Output must be a value bag');
        } catch (err) {
          console.log({ result });
          throw err;
        }
        return result;
      }

      const node = this._topology!.nodes.find((node) => node.id === nodeId) ?? failedInvariant();

      const compute = Effect.gen(this, function* () {
        const inputValues = yield* this.computeInputs(nodeId);
        // TODO(dmaretskyi): Consider resolving the node implementation at the start of the computation.
        const nodeSpec = yield* Effect.promise(() => this._computeNodeResolver(node.graphNode));
        if (nodeSpec.exec == null) {
          throw new Error(`No compute function for node type: ${node.graphNode.type}`);
        }

        const logger = yield* EventLogger;
        logger.log({
          type: 'begin-compute',
          nodeId: node.id,
          inputs: Object.keys(inputValues.values),
        });

        // const sanitizedInputs = yield* S.decode(node.meta.input)(inputValues);
        // TODO(dmaretskyi): Figure out schema validation on value bags.
        invariant(isValueBag(inputValues), 'Input must be a value bag');
        const output = yield* nodeSpec.exec(inputValues).pipe(
          Effect.withSpan('call-node'),
          Effect.provideService(EventLogger, {
            log: logger.log,
            nodeId: node.id,
          }),
        );
        invariant(isValueBag(output), 'Output must be a value bag');
        // log.info('output', { output });
        // if ('text' in output) {
        //   log.info('text in fiber', { text: getDebugName(output.text) });
        // }

        // const decodedOutput = yield* S.decode(node.meta.output)(output);

        const res: ValueBag<any>['values'] = {};
        for (const key of Object.keys(output.values)) {
          res[key] = yield* Effect.cached(output.values[key]).pipe(
            Effect.withSpan('cached-output', { attributes: { key } }),
          );
        }
        const resBag = makeValueBag(res);

        logger.log({
          type: 'end-compute',
          nodeId: node.id,
          outputs: Object.keys(resBag.values),
        });
        return resBag;
      }).pipe(Effect.withSpan('node-compute', { attributes: { nodeId } }));

      const cachedCompute = yield* compute.pipe(Effect.cached);
      this._computeCache.set(node.id, cachedCompute);

      const result = yield* cachedCompute;
      invariant(isValueBag(result), 'Output must be a value bag');
      return result;
    }).pipe(Effect.withSpan('compute-outputs', { attributes: { nodeId } }));
  }

  /**
   * Returns node ids of all nodes that depend on the given node.
   */
  getAllDependantNodes(nodeId: string): string[] {
    const visited = new Set<string>();

    const recurse = (node: TopologyNode) => {
      if (visited.has(node.id)) {
        return;
      }

      visited.add(node.id);
      for (const output of node.outputs) {
        for (const bound of output.boundTo) {
          recurse(this._topology!.nodes.find((node) => node.id === bound.nodeId) ?? failedInvariant());
        }
      }
    };

    invariant(this._topology, 'Graph not loaded');
    const node = this._topology!.nodes.find((node) => node.id === nodeId) ?? failedInvariant();
    recurse(node);

    visited.delete(nodeId);
    return Array.from(visited);
  }
}
