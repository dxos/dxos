//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { type DXN } from '@dxos/keys';

import { compileOrThrow, type GraphExecutor } from '../compiler';
import { NODE_INPUT, NODE_OUTPUT } from '../nodes';
import {
  type ComputeEffect,
  type ComputeGraphModel,
  type Executable,
  makeValueBag,
  NotExecuted,
  type ValueBag,
} from '../types';

export class Workflow {
  constructor(
    private readonly _dxn: DXN,
    private readonly _graph: ComputeGraphModel,
    private readonly _executor: GraphExecutor,
    private readonly _resolvedNodeById: Map<string, Executable>,
  ) {}

  run(input: ValueBag<any>): ComputeEffect<ValueBag<any>> {
    const inputNodes = this._graph.nodes.filter((node) => node.type === NODE_INPUT);
    if (inputNodes.length !== 1) {
      throw new Error(`Ambiguous workflow(${this._dxn.toString()}) entrypoint, use runFrom(inputNodeId, args) method.`);
    }
    return this.runFrom(inputNodes[0].id, input);
  }

  runFrom(inputNodeId: string, input: ValueBag<any>): ComputeEffect<ValueBag<any>> {
    const executor = this._executor.clone();

    let inputExists = false;
    const inputNodes = this._graph.nodes.filter((node) => node.type === NODE_INPUT);
    for (const node of inputNodes) {
      if (node.id === inputNodeId) {
        inputExists = true;
        executor.setOutputs(node.id, Effect.succeed(input));
      } else {
        executor.setOutputs(node.id, Effect.fail(NotExecuted));
      }
    }

    if (!inputExists) {
      throw new Error(`No ${inputNodeId} node exists in workflow ${this._dxn.toString()}.`);
    }

    const allAffectedNodes = executor.getAllDependantNodes(inputNodeId);

    return Effect.gen(this, function* () {
      const tasks: ComputeEffect<ValueBag<any>>[] = allAffectedNodes.map((nodeId) => {
        const executable = this._resolvedNodeById.get(nodeId)!;
        if (!executable) {
          throw new Error(`Node ${nodeId} was not resolved in ${this._dxn.toString()}.`);
        }
        const computingOutputs = executable.exec != null;
        const effect = computingOutputs ? executor.computeOutputs(nodeId) : executor.computeInputs(nodeId);
        return effect.pipe(Effect.withSpan('workflowNode', { attributes: { workflowDxn: this._dxn, nodeId } }));
      });

      const results = yield* Effect.all(tasks);

      const outputNodeId = this._graph.nodes.find((node) => node.type === NODE_OUTPUT)?.id;
      const outputNodeIndex = allAffectedNodes.findIndex((nodeId) => nodeId === outputNodeId);
      return outputNodeIndex ? results[outputNodeIndex] : makeValueBag({});
    }).pipe(Effect.withSpan('workflow', { attributes: { workflowDxn: this._dxn } }));
  }

  getResolvedNode(nodeId: string): Executable | undefined {
    return this._resolvedNodeById.get(nodeId);
  }

  async asExecutable(): Promise<Executable> {
    const inputNodes = this._graph.nodes.filter((node) => node.type === NODE_INPUT);
    if (inputNodes.length !== 1) {
      throw new Error(`Workflow(${this._dxn.toString()}) can't be an executable: no unique input node.`);
    }

    const outputNodes = this._graph.nodes.filter((node) => node.type === NODE_OUTPUT);
    if (inputNodes.length !== 1) {
      throw new Error(`Workflow(${this._dxn.toString()}) can't be an executable: no unique output node.`);
    }

    return compileOrThrow({
      graph: this._graph,
      inputNodeId: inputNodes[0].id,
      outputNodeId: outputNodes[0].id,
      computeResolver: async (node) => {
        return this._resolvedNodeById.get(node.id)!;
      },
    });
  }

  asGraph() {
    return this._graph;
  }
}
