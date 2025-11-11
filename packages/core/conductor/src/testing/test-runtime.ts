//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';

import { raise } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { GraphExecutor } from '../compiler';
import {
  type ComputeGraphModel,
  type ComputeNode,
  type ConductorError,
  type Executable,
  type ValueBag,
  type ValueRecord,
} from '../types';
import { WorkflowLoader } from '../workflow';
import { type Services } from '../../../functions/src';

export class TestRuntime {
  // TODO(burdon): Index by DXN; ComputeGraph instances.
  private readonly _graphs = new Map<string, ComputeGraphModel>();

  private readonly _nodes = new Map<string, Executable>();

  private readonly _workflowLoader = new WorkflowLoader({
    graphLoader: async (graphDxn: DXN) => this.getGraph(graphDxn).root,
    nodeResolver: async (node: ComputeNode) => this._nodes.get(node.type!)!,
  });

  constructor() {}

  get graphs() {
    return this._graphs;
  }

  get nodes() {
    return this._nodes;
  }

  getGraph(graphDxn: DXN): ComputeGraphModel {
    const graph = this._graphs.get(graphDxn.toString());
    invariant(graph, `Graph not found: ${graphDxn}`);
    return graph;
  }

  // TODO(burdon): Require DXN to be set on graph.
  registerGraph(graphDxn: string, graph: ComputeGraphModel): this {
    this._graphs.set(graphDxn, graph);
    return this;
  }

  registerNode(nodeType: string, node: Executable): this {
    this._nodes.set(nodeType, node);
    return this;
  }

  runGraph<T extends ValueRecord = any>(
    graphDxn: string,
    input: ValueBag<any>,
  ): Effect.Effect<ValueBag<T>, ConductorError, Services | Scope.Scope> {
    return Effect.gen(this, function* () {
      const program = yield* Effect.promise(() => this._workflowLoader.load(DXN.parse(graphDxn)));
      return yield* program.run(input);
    }).pipe(Effect.withSpan('compute-graph'));
  }

  // TODO(dmaretskyi): Support cases where the are no or multiple "input" nodes.
  //  There can be a graph which starts evaluating from constant nodes.
  runFromInput(
    graphDxn: string,
    inputNodeId: string,
    input: ValueBag<any>,
  ): Effect.Effect<Record<string, ValueBag<any>>, ConductorError, Services | Scope.Scope> {
    return Effect.gen(this, function* () {
      const workflow = yield* Effect.promise(() => this._workflowLoader.load(DXN.parse(graphDxn)));
      const executor = new GraphExecutor({
        computeNodeResolver: async (node: ComputeNode) => workflow.getResolvedNode(node.id)!,
      });

      const graph = this._graphs.get(graphDxn) ?? raise(new Error(`Graph not found: ${graphDxn}`));
      yield* Effect.promise(() => executor.load(graph));

      executor.setOutputs(inputNodeId, Effect.succeed(input));
      const dependantNodes = executor.getAllDependantNodes(inputNodeId);
      const result: Record<string, ValueBag<any>> = {};
      for (const nodeId of dependantNodes) {
        result[nodeId] = yield* executor.computeInputs(nodeId);
      }

      return result;
    });
  }
}
