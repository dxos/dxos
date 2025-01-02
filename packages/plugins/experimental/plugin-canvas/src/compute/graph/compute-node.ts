//
// Copyright 2024 DXOS.org
//

// import { inspect } from 'node:util';

import { signal, type Signal } from '@preact/signals-core';

import { type Context } from '@dxos/context';
import { AST, S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type AsyncUpdate } from './state-machine';

/**
 * Represents a compute element, which may take inputs from multiple other nodes, and output a value to other nodes.
 */
// TODO(burdon): Node id.
export abstract class ComputeNode<Input, Output> {
  abstract readonly type: string;

  /**
   * Async callback set by the state machine.
   */
  private _callback?: AsyncUpdate<Output>;

  /**
   * The input is either a map of properties or a scalar value depending on the INPUT type.
   */
  // TODO(burdon): Move into separate structure to keep ComputeNode stateless.
  protected _input: Signal<Input | undefined>;

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
    return { type: this.type, input: this._input.value, ready: this.ready };
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
  initialize(ctx: Context, cb: AsyncUpdate<Output>) {
    this._callback = cb;
    this.onInitialize(ctx);
  }

  /**
   * Reset state.
   */
  reset() {
    this._input.value = AST.isTypeLiteral(this.inputSchema.ast) ? ({} as Input) : undefined;
  }

  /**
   * Set state directly (e.g., for nodes that have no input and are controlled by ux).
   * Send an async update to the state machine.
   */
  setState(value: Output): this {
    invariant((this.inputSchema as S.Schema<any>) === S.Void, 'invalid state');
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
  setInput(property: keyof Input | undefined, value: any) {
    log('set', { node: this.type, property, value });
    invariant(value !== undefined, 'computed values should not be undefined');

    // TODO(burdon): Standardize all nodes to require a property (i.e., remove default?)
    const p = property && AST.getPropertySignatures(this.inputSchema.ast).find((p) => p.name === property);
    invariant(!property || p, `invalid property: ${String(property)}`);

    if (property) {
      invariant(this._input.value, `input is not defined for property: ${String(property)}`);
      this._input.value[property] = value;
    } else {
      this._input.value = value;
    }

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
    const output = await this.invoke(this._input.value as Input);
    log.info('exec', { node: this, input: this._input.value, output });
    return output;
  }

  protected onInitialize(ctx: Context) {}

  // TODO(burdon): Use Effect try (for error propagation, logging, etc.)
  protected abstract invoke(input: Input): Promise<Output>;
}
