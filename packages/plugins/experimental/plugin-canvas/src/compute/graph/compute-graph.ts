//
// Copyright 2024 DXOS.org
//

import { inspect } from 'node:util';

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
  // TODO(burdon): Match property name to input keys.
  property: string;
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
  protected _input: any; // Partial<Input> | undefined;

  constructor(
    readonly input: S.Schema<Input>,
    readonly output: S.Schema<Output>,
  ) {
    this.reset();
  }

  [inspect.custom]() {
    return inspect(this.toJSON());
  }

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
    if (AST.isVoidKeyword(this.input.ast)) {
      return true;
    }

    if (AST.isTypeLiteral(this.input.ast)) {
      invariant(this._input);
      return Object.keys(this._input).length === AST.getPropertySignatures(this.input.ast).length;
    } else {
      return this._input !== undefined;
    }
  }

  /**
   * Current value.
   */
  get value(): Input | undefined {
    return this.ready ? this._input : undefined;
  }

  /**
   * Reset state.
   */
  reset() {
    this._input = AST.isTypeLiteral(this.input.ast) ? {} : undefined;
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
      invariant(this._input);
      this._input[property] = value;
    } else {
      this._input = value;
    }
  }

  /**
   * Run computation.
   */
  async exec(): Promise<Output> {
    invariant(!AST.isVoidKeyword(this.output.ast));
    invariant(this.ready);
    log.info('exec', { node: this, input: this._input });
    const output = await this.invoke(this._input as Input);
    log.info('exec', { node: this, output });
    this.reset();
    return output;
  }

  /**
   * Initialize the node (and set clean-up logic).
   * @param ctx
   * @param cb
   */
  open(ctx: Context, cb: AsyncUpdate<Output>) {}

  // TODO(burdon): Use Effect try (for error propagation, logging, etc.)
  protected abstract invoke(input: Input): Promise<Output>;
}
