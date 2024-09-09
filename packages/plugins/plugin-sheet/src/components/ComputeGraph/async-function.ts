//
// Copyright 2024 DXOS.org
//

import { CellError, ErrorType, EmptyValue, FunctionPlugin, type HyperFormula } from 'hyperformula';
import { type InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import { type InterpreterValue } from 'hyperformula/typings/interpreter/InterpreterValue';
import { type ProcedureAst } from 'hyperformula/typings/parser';
import defaultsDeep from 'lodash.defaultsdeep';

import { debounce, type UnsubscribeCallback } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';

// TODO(burdon): API gateways!
//  https://publicapis.io
//  https://api-ninjas.com/api/cryptoprice
//  https://developers.google.com/apis-explorer
//  https://publicapis.io/coin-desk-api

// TODO(burdon): Create wrapper.
export type AsyncFunction = (...args: any) => Promise<InterpreterValue>;

export type FunctionOptions = {
  ttl?: number;
};

export type FunctionContextOptions = {
  defaultTtl: number;
  recalculationDelay: number;
  remoteFunctionUrl: string;
};

export const defaultFunctionContextOptions: FunctionContextOptions = {
  defaultTtl: 5_000,
  recalculationDelay: 200,
  remoteFunctionUrl: 'https://functions-staging.dxos.workers.dev',
};

/**
 * The context singleton for the model is passed into custom functions.
 *
 * HyperFormula does not support async functions.
 * - https://hyperformula.handsontable.com/guide/custom-functions.html
 * - https://hyperformula.handsontable.com/guide/known-limitations.html#known-limitations
 * - https://github.com/handsontable/hyperformula/issues/892
 */
export class FunctionContext {
  // Mangle name with params.
  static createInvocationKey(name: string, ...args: any) {
    return JSON.stringify({ name, ...args });
  }

  // TODO(wittjosiah): Persist cached values.
  // Cached values for cell.
  private readonly _cache = new Map<string, { value: InterpreterValue; ts: number }>();

  // Active requests.
  private readonly _pending = new Map<string, number>();

  // Query subscriptions.
  private readonly _subscriptions = new Map<string, UnsubscribeCallback>();

  // Invocation count.
  private _invocations: Record<string, number> = {};

  private readonly _options: FunctionContextOptions;
  private readonly _onUpdate: () => void;

  constructor(
    private readonly _hf: HyperFormula,
    private readonly _space: Space | undefined,
    onUpdate: (context: FunctionContext) => void,
    _options?: Partial<FunctionContextOptions>,
  ) {
    this._options = defaultsDeep(_options ?? {}, defaultFunctionContextOptions);
    this._onUpdate = debounce(() => {
      // TODO(burdon): Better way to trigger recalculation?
      //  NOTE: rebuildAndRecalculate resets the undo history.
      this._hf.resumeEvaluation();
      onUpdate(this);
    }, this._options.recalculationDelay);
  }

  get space() {
    return this._space;
  }

  get remoteFunctionUrl() {
    return this._options.remoteFunctionUrl;
  }

  get info() {
    return { cache: this._cache.size, invocations: this._invocations };
  }

  flush() {
    this._cache.clear();
    this._invocations = {};
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.clear();
  }

  createSubscription(name: string, unsubscribe: UnsubscribeCallback) {
    this._subscriptions.get(name)?.();
    this._subscriptions.set(name, unsubscribe);
  }

  /**
   * Exec the function if TTL has expired.
   * Return the cached value.
   */
  invokeFunction(
    name: string,
    state: InterpreterState,
    args: any[],
    cb: AsyncFunction,
    options?: FunctionOptions,
  ): InterpreterValue | undefined {
    const ttl = options?.ttl ?? this._options.defaultTtl;

    const { formulaAddress: cell } = state;
    const invocationKey = FunctionContext.createInvocationKey(name, ...args);
    const { value = undefined, ts = 0 } = this._cache.get(invocationKey) ?? {};

    const now = Date.now();
    const delta = now - ts;
    if ((!ts || delta > ttl) && !this._pending.has(invocationKey)) {
      this._pending.set(invocationKey, now);
      setTimeout(async () => {
        this._invocations[name] = (this._invocations[name] ?? 0) + 1;
        try {
          // Exec function.
          const value = await cb(...args);
          this._cache.set(invocationKey, { value, ts: Date.now() });
          log('set', { cell, value });
          this._onUpdate();
        } catch (err) {
          // TODO(burdon): Show error to user.
          log.warn('failed', { cell, err });
          this._cache.set(invocationKey, { value: new CellError(ErrorType.ERROR, 'Function failed.'), ts: Date.now() });
        } finally {
          this._pending.delete(invocationKey);
        }
      });
    }

    log('invoke', { cell, name, args, cache: value });
    return value;
  }
}

/**
 * Base class for async functions.
 */
export class FunctionPluginAsync extends FunctionPlugin {
  get context() {
    return this.config.context as FunctionContext;
  }

  runAsyncFunction(ast: ProcedureAst, state: InterpreterState, cb: AsyncFunction, options?: FunctionOptions) {
    const { procedureName } = ast;
    const metadata = this.metadata(procedureName);
    return this.runFunction(ast.args, state, metadata, (...args: any) => {
      return this.context.invokeFunction(procedureName, state, args, cb, options) ?? EmptyValue;
    });
  }
}
