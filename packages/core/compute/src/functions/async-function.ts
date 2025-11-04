//
// Copyright 2024 DXOS.org
//

import type * as ManagedRuntime from 'effect/ManagedRuntime';
import defaultsDeep from 'lodash.defaultsdeep';

import { type CleanupFn, debounce } from '@dxos/async';
import type { Space } from '@dxos/client/echo';
import { type FunctionInvocationService } from '@dxos/functions';
import { log } from '@dxos/log';
import type { RawInterpreterValue, SimpleCellAddress } from '@dxos/vendor-hyperformula';
import type { InterpreterState } from '@dxos/vendor-hyperformula';
import type { InterpreterValue } from '@dxos/vendor-hyperformula';
import type { ProcedureAst } from '@dxos/vendor-hyperformula';
import { CellError, EmptyValue, ErrorType, FunctionPlugin, type HyperFormula } from '@dxos/vendor-hyperformula';

// TODO(burdon): Create API gateways:
//  https://publicapis.io
//  https://api-ninjas.com/api/cryptoprice
//  https://developers.google.com/apis-explorer
//  https://publicapis.io/coin-desk-api

export type AsyncFunction = (...args: any) => Promise<InterpreterValue>;

export type FunctionUpdateEvent = {
  name: string;
  cell: SimpleCellAddress;
};

export type FunctionOptions = {
  ttl?: number;
};

export type FunctionContextOptions = {
  defaultTtl: number;
  debounceDelay: number;
  onUpdate?: (update: FunctionUpdateEvent) => void;
};

export const defaultFunctionContextOptions: Pick<FunctionContextOptions, 'defaultTtl' | 'debounceDelay'> = {
  defaultTtl: 5_000,
  debounceDelay: 200,
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
  static createInvocationKey(name: string, ...args: any): string {
    return JSON.stringify({ name, ...args });
  }

  // TODO(wittjosiah): Persist cached values.
  // Cached values for cell.
  private readonly _cache = new Map<string, { value: InterpreterValue; ts: number }>();

  // Active requests.
  private readonly _pending = new Map<string, number>();

  // Query subscriptions.
  private readonly _subscriptions = new Map<string, CleanupFn>();

  // Invocation count.
  private _invocations: Record<string, number> = {};

  private readonly _options: FunctionContextOptions;

  // Debounced update handler.
  private readonly _onUpdate: (update: FunctionUpdateEvent) => void;

  constructor(
    private readonly _hf: HyperFormula,
    private readonly _runtime: ManagedRuntime.ManagedRuntime<FunctionInvocationService, never>,
    private readonly _space: Space | undefined,
    _options?: Partial<FunctionContextOptions>,
  ) {
    this._options = defaultsDeep(_options ?? {}, defaultFunctionContextOptions);
    this._onUpdate = debounce((update) => {
      log('update', update);
      // TODO(burdon): Better way to trigger recalculation? (NOTE: rebuildAndRecalculate resets the undo history.)
      this._hf.resumeEvaluation();
      this._options.onUpdate?.(update);
    }, this._options.debounceDelay);
  }

  get space() {
    return this._space;
  }

  get info() {
    return { cache: this._cache.size, invocations: this._invocations };
  }

  get runtime() {
    return this._runtime;
  }

  flush(): void {
    this._cache.clear();
    this._invocations = {};
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.clear();
  }

  createSubscription(name: string, unsubscribe: CleanupFn): void {
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
          this._onUpdate({ name, cell });
        } catch (err) {
          // TODO(burdon): Show error to user.
          log.warn('failed', { cell, err });
          this._cache.set(invocationKey, { value: new CellError(ErrorType.ERROR, 'Function failed.'), ts: Date.now() });
        } finally {
          this._pending.delete(invocationKey);
        }
      });
    }

    log.info('invoke', { cell, name, args, cache: value });
    return value;
  }
}

/**
 * Base class for async functions.
 */
export class AsyncFunctionPlugin extends FunctionPlugin {
  get context() {
    return this.config.context as FunctionContext;
  }

  /**
   * Immediately returns cached value then runs the async function.
   */
  protected runAsyncFunction(
    ast: ProcedureAst,
    state: InterpreterState,
    cb: AsyncFunction,
    options?: FunctionOptions,
  ): RawInterpreterValue {
    const { procedureName } = ast;
    const metadata = this.metadata(procedureName);
    return this.runFunction(
      ast.args,
      state,
      metadata,
      (...args: any) => this.context.invokeFunction(procedureName, state, args, cb, options) ?? EmptyValue,
    );
  }
}
