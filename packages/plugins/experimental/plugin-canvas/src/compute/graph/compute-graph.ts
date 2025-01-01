//
// Copyright 2024 DXOS.org
//

// import { inspect } from 'node:util';

import { signal, type Signal } from '@preact/signals-core';

import { type Context } from '@dxos/context';
import { AST, type S } from '@dxos/echo-schema';
import { type Graph, GraphModel, type GraphNode, type GraphEdge } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type AsyncUpdate } from './state-machine';

/**
 * Dependency graph of compute nodes.
 * Each compute node has an INPUT and OUTPUT type.
 */
// TODO(burdon): The node and edge types should be schema (not the runtime class)?
// TODO(burdon): Can GraphModel manage this binding?
// TODO(burdon): Initially leave as runtime and sync on startup.
export type ComputeGraph = GraphModel<GraphNode<ComputeNode<any, any>>, GraphEdge<ComputeEdge | void>>;

export const createComputeGraph = (graph?: Graph): ComputeGraph => {
  return new GraphModel<GraphNode<ComputeNode<any, any>>, GraphEdge<ComputeEdge | undefined>>(graph);
};

/**
 * Represents a connection between nodes.
 */
export type ComputeEdge = {
  input?: string;
  output?: string;
};

/**
 * Represents a compute element, which may take inputs from multiple other nodes, and output a value to other nodes.
 */
export abstract class ComputeNode<Input, Output> {
  // TODO(burdon): Replace with schema.
  abstract readonly type: string;

  /**
   * The input is either a map of properties or a scalar value depending on the INPUT type.
   */
  // TODO(burdon): Move into separate structure to keep ComputeNode stateless.
  protected _input: Signal<Input | undefined>;

  private _callback?: AsyncUpdate<Output>;

  constructor(
    readonly inputSchema: S.Schema<Input>,
    readonly outputSchema: S.Schema<Output>,
  ) {
    this._input = signal(AST.isTypeLiteral(this.inputSchema.ast) ? ({} as Input) : undefined);
  }

  // TODO(burdon): Build issue.
  // [inspect.custom]() {
  //   return inspect(this.toJSON());
  // }

  toString() {
    return `ComputeNode(${this.type})`;
  }

  toJSON() {
    return { type: this.type };
  }

  /**
   * Determine if node has all required inputs.
   */
  get ready() {
    if (AST.isVoidKeyword(this.inputSchema.ast)) {
      return true;
    }

    if (AST.isTypeLiteral(this.inputSchema.ast)) {
      invariant(this._input.value);
      return Object.keys(this._input.value).length === AST.getPropertySignatures(this.inputSchema.ast).length;
    } else {
      return this._input.value !== undefined;
    }
  }

  /**
   * Current value.
   */
  get input(): Signal<Input | undefined> {
    return this._input;
  }

  /**
   * Reset state.
   */
  reset() {
    this._input.value = AST.isTypeLiteral(this.inputSchema.ast) ? ({} as Input) : undefined;
  }

  /**
   * Set input value.
   * @param property
   * @param value
   */
  // TODO(burdon): Check property and match type.
  setInput(property: keyof Input | undefined, value: any) {
    log.info('set', { property, value });
    invariant(value !== undefined, 'computed values should not be undefined');
    if (property) {
      invariant(this._input.value, `input is not defined for property: ${String(property)}`);
      this._input.value[property] = value;
    } else {
      this._input.value = value;
    }
  }

  /**
   * Run computation.
   */
  async exec(): Promise<Output> {
    invariant(!AST.isVoidKeyword(this.outputSchema.ast), 'cannot exec void output');
    invariant(this.ready, 'not ready');
    log('exec', { node: this, input: this._input.value });
    const output = await this.invoke(this._input.value as Input);
    log('exec', { node: this, output });
    return output;
  }

  /**
   * Send an async update to the state machine.
   */
  update(value: Output) {
    if (this._callback) {
      this._callback(value);
    }
  }

  /**
   * Initialize the node (and set clean-up logic).
   */
  initialize(ctx: Context, cb: AsyncUpdate<Output>) {
    this._callback = cb;
    this.onInitialize(ctx);
  }

  protected onInitialize(ctx: Context) {}

  // TODO(burdon): Use Effect try (for error propagation, logging, etc.)
  protected abstract invoke(input: Input): Promise<Output>;
}
