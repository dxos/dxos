//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { raise } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { type URI } from '@dxos/keys';

import { GraphExecutor } from '../compiler';
import {
  ComputeNodeContext,
  type ComputeGraphModel,
  type ComputeNode,
  type ComputeRequirements,
  type ConductorError,
  type Executable,
  type ValueBag,
  type ValueRecord,
} from '../types';
import { WorkflowLoader } from '../workflow';

export class TestRuntime {
  // TODO(burdon): Index by DXN; ComputeGraph instances.
  private readonly _graphs = new Map<URI.URI, ComputeGraphModel>();

  private readonly _nodes = new Map<string, Executable>();

  private readonly _workflowLoader = new WorkflowLoader({
    graphLoader: async (graphUri: URI.URI) => this.getGraph(graphUri).root,
    nodeResolver: async (node: ComputeNode) => this._nodes.get(node.type!)!,
  });

  get graphs() {
    return this._graphs;
  }

  get nodes() {
    return this._nodes;
  }

  getGraph(graphUri: URI.URI): ComputeGraphModel {
    const graph = this._graphs.get(graphUri);
    invariant(graph, `Graph not found: ${graphUri}`);
    return graph;
  }

  // TODO(burdon): Require DXN to be set on graph.
  registerGraph(graphUri: URI.URI, graph: ComputeGraphModel): this {
    this._graphs.set(graphUri, graph);
    return this;
  }

  registerNode(nodeType: string, node: Executable): this {
    this._nodes.set(nodeType, node);
    return this;
  }

  runGraph<T extends ValueRecord = any>(
    graphUri: URI.URI,
    input: ValueBag<any>,
  ): Effect.Effect<ValueBag<T>, ConductorError, Exclude<ComputeRequirements, ComputeNodeContext>> {
    return Effect.gen(this, function* () {
      const program = yield* Effect.promise(() => this._workflowLoader.load(graphUri));
      return yield* program.run(input);
    }).pipe(Effect.withSpan('compute-graph'), Effect.provide(ComputeNodeContext.layerNoop));
  }

  // TODO(dmaretskyi): Support cases where the are no or multiple "input" nodes.
  //  There can be a graph which starts evaluating from constant nodes.
  runFromInput(
    graphUri: URI.URI,
    inputNodeId: string,
    input: ValueBag<any>,
  ): Effect.Effect<Record<string, ValueBag<any>>, ConductorError, Exclude<ComputeRequirements, ComputeNodeContext>> {
    return Effect.gen(this, function* () {
      const workflow = yield* Effect.promise(() => this._workflowLoader.load(graphUri));
      const executor = new GraphExecutor({
        computeNodeResolver: async (node: ComputeNode) => workflow.getResolvedNode(node.id)!,
      });

      const graph = this._graphs.get(graphUri) ?? raise(new Error(`Graph not found: ${graphUri}`));
      yield* Effect.promise(() => executor.load(graph));

      executor.setOutputs(inputNodeId, Effect.succeed(input));
      const dependantNodes = executor.getAllDependantNodes(inputNodeId);
      const result: Record<string, ValueBag<any>> = {};
      for (const nodeId of dependantNodes) {
        result[nodeId] = yield* executor.computeInputs(nodeId);
      }

      return result;
    }).pipe(Effect.withSpan('compute-graph'), Effect.provide(ComputeNodeContext.layerNoop));
  }
}
