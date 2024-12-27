//
// Copyright 2024 DXOS.org
//

import { inspect } from 'node:util';

import { Event } from '@dxos/async';
import { AST, S } from '@dxos/echo-schema';
import { type GraphNode, GraphModel, type GraphEdge } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

/**
 * Dependency graph of compute nodes.
 * Each compute node has an INPUT and OUTPUT type.
 */
export type ComputeGraph = GraphModel<GraphNode<ComputeNode<any, any>>, GraphEdge<ComputeEdge | void>>;

export const createComputeGraph = (): ComputeGraph => {
  return new GraphModel<GraphNode<ComputeNode<any, any>>, GraphEdge<ComputeEdge | undefined>>();
};

/**
 * Manages the dependency graph and async propagation of computed values.
 * Compute Nodes are invoked when all of their inputs are provided.
 * Root Nodes have a Void input type and are processed first.
 */
// TODO(burdon): Extend resource?
// TODO(burdon): Move to compute (use hyperformula).
// TODO(burdon): Maps onto hyperformula?
export class StateMachine {
  public readonly update = new Event<{ node: GraphNode<ComputeNode<any, any>>; value: any }>();

  constructor(private readonly _graph: ComputeGraph) {}

  // TODO(burdon): Start scheduler.
  async start() {}

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

export type ComputeEdge = {
  // TODO(burdon): Match property name to input keys.
  property: string;
};

/**
 *
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
    return `Node(${this.type})`;
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

  // TODO(burdon): Effect try (for error propagation, logging, etc.)
  protected abstract invoke(input: Input): Promise<Output>;
}

//
// Compute node types.
//

export class Switch extends ComputeNode<void, boolean> {
  override readonly type = 'switch';
  private _state = false;

  constructor() {
    super(S.Void, S.Boolean);
  }

  setState(state: boolean): this {
    this._state = state;
    return this;
  }

  override async invoke() {
    return this._state;
  }
}

export class Beacon extends ComputeNode<boolean, void> {
  override readonly type = 'beacon';

  constructor() {
    super(S.Boolean, S.Void);
  }

  override async invoke() {
    invariant('Invalid state');
  }
}

// TODO(burdon): Array or subtype with named properties?
const LogicGateInput = S.mutable(S.Struct({ a: S.Boolean, b: S.Boolean }));
type LogicGateInput = S.Schema.Type<typeof LogicGateInput>;

export class NotGate extends ComputeNode<boolean, boolean> {
  override readonly type = 'not';

  constructor() {
    super(S.Boolean, S.Boolean);
  }

  override async invoke(input: boolean) {
    return !input;
  }
}

export class OrGate extends ComputeNode<LogicGateInput, boolean> {
  override readonly type = 'or';

  constructor() {
    super(LogicGateInput, S.Boolean);
  }

  override async invoke(input: LogicGateInput) {
    return input.a || input.b;
  }
}

export class AndGate extends ComputeNode<LogicGateInput, boolean> {
  override readonly type = 'and';

  constructor() {
    super(LogicGateInput, S.Boolean);
  }

  override async invoke(input: LogicGateInput) {
    return input.a && input.b;
  }
}

// TODO(burdon): Logging "tap" pass-through.

// TODO(burdon): Start/stop nodes or implement schedule.
// export class Timer extends ComputeNode<void, number> {
//   override readonly type = 'timer';
//
//   constructor() {
//     super(S.Void, S.Number);
//   }
//
//   override async invoke() {}
// }
//
// export class Subscription extends ComputeNode<void, ReactiveObject<any>[]> {
//   override readonly type = 'subscription';
//
//   override async run() {
//     throw new Error('Invalid state');
//   }
// }
//
// export class RemoteFunction<Input> extends ComputeNode<Input, void> {
//   override readonly type = 'function';
//
//   override async run(input: Input) {
//     invariant('Invalid state');
//   }
// }
//
// export class TransformerFunction extends ComputeNode<string, string> {
//   override readonly type = 'gpt';
//
//   override async run(input: string) {
//     invariant('Invalid state');
//   }
// }
