//
// Copyright 2024 DXOS.org
//

import { inspect } from 'node:util';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { AST, S } from '@dxos/echo-schema';
import { type GraphNode } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type ComputeGraph } from './compute-graph';

export const InvalidStateError = Error;

/**
 * Callback to notify the state machine of a scheduled update.
 */
export type AsyncUpdate<T> = (value: T) => void;

/**
 * Manages the dependency graph and async propagation of computed values.
 * Compute Nodes are invoked when all of their inputs are provided.
 * Root Nodes have a Void input type and are processed first.
 */
// TODO(burdon): Move to compute (wihout hyperformula dependency). Maps onto hyperformula as client runtime?
export class StateMachine {
  public readonly update = new Event<{ node: GraphNode<ComputeNode<any, any>>; value: any }>();

  private _ctx?: Context;

  constructor(private readonly _graph: ComputeGraph) {}

  get isOpen() {
    return this._ctx !== undefined;
  }

  // TODO(burdon): Extend resource?
  async open() {
    if (this._ctx) {
      await this.close();
    }

    this._ctx = new Context();
    await Promise.all(
      this._graph.nodes.map(async (node) =>
        node.data.open(this._ctx, (output: any) => {
          if (!this._ctx) {
            return;
          }

          this.update.emit({ node, value: output });
          void this._propagate(node, output);
        }),
      ),
    );
  }

  async close() {
    if (this._ctx) {
      await this._ctx.dispose();
      this._ctx = undefined;
    }
  }

  async exec(node?: GraphNode<ComputeNode<any, any>> | undefined) {
    if (node) {
      // Update root node.
      const output = await node.data.exec();
      this.update.emit({ node, value: output });
      void this._propagate(node, output);
    } else {
      // Fire root notes.
      for (const node of this._graph.nodes) {
        if (node.data.input === S.Void) {
          const output = await node.data.exec();
          this.update.emit({ node, value: output });
          void this._propagate(node, output);
        }
      }
    }
  }

  /**
   * Depth first propagation of compute events.
   */
  private async _propagate<T>(node: GraphNode<ComputeNode<any, T>>, output: T) {
    for (const edge of this._graph.getEdges({ source: node.id })) {
      const target = this._graph.getNode(edge.target);
      invariant(target);
      target.data.setInput(edge.data?.property, output);
      if (target.data.output === S.Void) {
        this.update.emit({ node: target, value: output });
      } else {
        if (target.data.ready) {
          const output = await target.data.exec();
          this.update.emit({ node: target, value: output });
          void this._propagate(target, output);
        }
      }
    }
  }
}

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
  abstract readonly type: string;

  /**
   * The input is either a map of properties or a scalar value depending on the INPUT type.
   */
  // TODO(burdon): Move into separate structure to keep ComputeNode stateless.
  protected _input: any; // Partial<Input> | undefined;

  protected constructor(
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
