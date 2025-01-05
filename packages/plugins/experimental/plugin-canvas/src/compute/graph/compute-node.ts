//
// Copyright 2024 DXOS.org
//

import { signal, type Signal } from '@preact/signals-core';

import { type Context } from '@dxos/context';
import { inspectCustom } from '@dxos/debug';
import { AST, S, type BaseObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type AsyncUpdate, type StateMachineContext } from './state-machine';

export type Binding = Record<string, any>;

export const DEFAULT_INPUT = 'input';
export const DEFAULT_OUTPUT = 'result';

export const NoInput = S.Struct({});
export const NoOutput = S.Struct({});

export type NoInput = S.Schema.Type<typeof NoInput>;
export type NoOutput = S.Schema.Type<typeof NoOutput>;

/**
 * Represents a compute element, which may take inputs from multiple other nodes, and output a value to other nodes.
 */
// TODO(burdon): Node id.
export abstract class ComputeNode<Input extends Binding, Output extends Binding> {
  abstract readonly type: string;

  /**
   * Async callback set by the state machine.
   */
  protected _callback?: AsyncUpdate<Output>;

  // TODO(burdon): Remove?
  protected _context?: StateMachineContext;

  /**
   * The input is either a map of properties or a scalar value depending on the INPUT type.
   */
  // TODO(burdon): Move into separate structure to keep ComputeNode stateless.
  protected _input: Signal<Input> = signal({} as Input);

  constructor(
    readonly inputSchema: S.Schema<Input>,
    readonly outputSchema: S.Schema<Output>,
  ) {
    invariant(AST.isTypeLiteral(this.inputSchema.ast));
    invariant(AST.isTypeLiteral(this.outputSchema.ast));
  }

  [inspectCustom]() {
    return this.toJSON();
  }

  toString() {
    return `ComputeNode(${this.type})`;
  }

  toJSON() {
    return { type: this.type, input: this._input.value, ready: this.ready };
  }

  get input() {
    return this._input.value;
  }

  /**
   * Determine if node has all required inputs.
   */
  get ready() {
    // TODO(burdon): Use this check everywhere rather than === void.
    if (AST.isVoidKeyword(this.inputSchema.ast)) {
      return true;
    }

    if (AST.isTypeLiteral(this.inputSchema.ast)) {
      invariant(this._input.value);
      const required = AST.getPropertySignatures(this.inputSchema.ast).filter((p) => !p.isOptional);
      return Object.keys(this._input.value).length >= required.length;
    } else {
      return this._input.value !== undefined;
    }
  }

  /**
   * Initialize the node (and set clean-up logic).
   */
  async initialize(ctx: Context, context: StateMachineContext, cb: AsyncUpdate<Output>) {
    this._callback = cb;
    this._context = context;
    await this.onInitialize(ctx, context);
    ctx.onDispose(() => {
      this._context = undefined;
    });
  }

  /**
   * Reset state.
   */
  reset() {
    this._input.value = {} as Input;
  }

  /**
   * Set state directly (e.g., for nodes that have no input and are controlled by ux).
   * Send an async update to the state machine.
   */
  // TODO(burdon): Change to setOutputProp and match schema.
  // TODO(dmaretskyi): Make protected.
  setOutput(value: Output): this {
    invariant(this.getInputs().length === 0, 'invalid state');
    if (!this._callback) {
      log.warn('callback not set', { node: this });
    } else {
      this._callback(value);
    }
    return this;
  }

  /**
   * Set input property.
   * @param property
   * @param value
   */
  // TODO(burdon): Check property and type matches.
  setInput(property: keyof Input, value: any) {
    log('set', { node: this.type, property, value });
    invariant(value !== undefined, 'computed values should not be undefined');

    // TODO(burdon): Standardize all nodes to require a property (i.e., remove default?)
    const p = property && AST.getPropertySignatures(this.inputSchema.ast).find((p) => p.name === property);
    invariant(!property || p, `invalid property: ${String(property)}`);

    invariant(this._input.value, `input is not defined for property: ${String(property)}`);
    this._input.value[property] = value;
    return p?.isOptional;
  }

  /**
   * Run computation.
   */
  async exec(): Promise<Output> {
    invariant(!AST.isVoidKeyword(this.outputSchema.ast), 'cannot exec void output');
    invariant(this.ready, 'not ready');
    log('exec', { node: this, input: this._input.value });
    // TODO(burdon): Try/catch.
    try {
      const output = await this.invoke(this._input.value as Input);
      log.info('exec', { node: this, input: this._input.value, output });
      return output;
    } catch (err) {
      log.error('exec', { node: this, input: this._input.value, error: err });
      throw err;
    }
  }

  getInputs() {
    return AST.getPropertySignatures(this.inputSchema.ast);
  }

  getOutputs() {
    return AST.getPropertySignatures(this.outputSchema.ast);
  }

  protected onInitialize(ctx: Context, context: StateMachineContext): void | Promise<void> {}

  // TODO(burdon): Use Effect try (for error propagation, logging, etc.)
  // TODO(dmaretskyi): Change this to an `update` function that calls setOutput.
  protected abstract invoke(input: Input): Promise<Output>;
}
