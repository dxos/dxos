//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { createDefectLogger } from '@dxos/functions';
import { type DXN } from '@dxos/keys';

import { type GraphExecutor, compileOrThrow } from '../compiler';
import { NODE_INPUT, NODE_OUTPUT } from '../nodes';
import {
  type ComputeEffect,
  type ComputeGraphModel,
  type ComputeNode,
  type Executable,
  NotExecuted,
  ValueBag,
} from '../types';
import { pickProperty } from '../util';

/**
 * Compute graph executor.
 */
// TODO(burdon): Rename.
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
        const executable = this._requireResolved(nodeId);
        const computingOutputs = executable.exec != null;
        const effect = computingOutputs ? executor.computeOutputs(nodeId) : executor.computeInputs(nodeId);
        return effect.pipe(Effect.withSpan('workflowNode', { attributes: { workflowDxn: this._dxn, nodeId } }));
      });

      const results = yield* Effect.all(tasks);

      const outputNodeId = this._graph.nodes.find((node) => node.type === NODE_OUTPUT)?.id;
      const outputNodeIndex = allAffectedNodes.findIndex((nodeId) => nodeId === outputNodeId);
      return outputNodeIndex >= 0 ? results[outputNodeIndex] : ValueBag.make({});
    })
      .pipe(createDefectLogger())
      .pipe(Effect.withSpan('workflow', { attributes: { workflowDxn: this._dxn } }));
  }

  getResolvedNode(nodeId: string): Executable | undefined {
    return this._resolvedNodeById.get(nodeId);
  }

  /**
   * Returns information about expected input and output node types.
   * NODE_INPUT and NODE_OUTPUT have generic Record<string, any> schema, so we follow edges to
   * resolve expected input and output schema field types.
   */
  resolveMeta(): WorkflowMeta {
    const inputs = this._graph.nodes.filter((node) => node.type === NODE_INPUT);
    const resolveOutputsSchema = (sourceNode: ComputeNode): Schema.Struct<any> => {
      const properties = this._graph.edges
        .filter((e) => e.source === sourceNode.id)
        .map((edge) => [edge.output, pickProperty(this._requireResolved(edge.target).meta.input, edge.input)]);
      return Schema.Struct(Object.fromEntries(properties));
    };

    const outputs = this._graph.nodes.filter((node) => node.type === NODE_OUTPUT);
    const resolveInputsSchema = (targetNode: ComputeNode): Schema.Struct<any> => {
      const properties = this._graph.edges
        .filter((e) => e.target === targetNode.id)
        .map((edge) => [edge.input, pickProperty(this._requireResolved(edge.source).meta.output, edge.output)]);
      return Schema.Struct(Object.fromEntries(properties));
    };

    return {
      inputs: inputs.map((node) => ({ nodeId: node.id, schema: resolveOutputsSchema(node) })),
      outputs: outputs.map((node) => ({ nodeId: node.id, schema: resolveInputsSchema(node) })),
    };
  }

  async asExecutable(): Promise<Executable> {
    const inputNodes = this._graph.nodes.filter((node) => node.type === NODE_INPUT);
    if (inputNodes.length !== 1) {
      throw new Error(`Workflow(${this._dxn.toString()}) can't be an executable: no unique input node.`);
    }

    const outputNodes = this._graph.nodes.filter((node) => node.type === NODE_OUTPUT);
    if (outputNodes.length !== 1) {
      throw new Error(`Workflow(${this._dxn.toString()}) can't be an executable: no unique output node.`);
    }

    return compileOrThrow({
      graph: this._graph,
      inputNodeId: inputNodes[0].id,
      outputNodeId: outputNodes[0].id,
      computeResolver: async (node) => this._resolvedNodeById.get(node.id)!,
    });
  }

  asGraph(): ComputeGraphModel {
    return this._graph;
  }

  private _requireResolved(nodeId: string): Executable<Schema.Schema.AnyNoContext, Schema.Schema.AnyNoContext> {
    const resolved = this._resolvedNodeById.get(nodeId);
    if (!resolved) {
      throw new Error(`Node ${nodeId} was not resolved in ${this._dxn.toString()}.`);
    }
    return resolved;
  }
}

type NodeSchema = {
  nodeId: string;
  schema: Schema.Struct<any>;
};

export type WorkflowMeta = {
  inputs: NodeSchema[];
  outputs: NodeSchema[];
};
