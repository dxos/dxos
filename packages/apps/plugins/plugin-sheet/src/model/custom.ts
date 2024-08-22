//
// Copyright 2024 DXOS.org
//

import { EmptyValue, FunctionArgumentType, FunctionPlugin } from 'hyperformula';
import type { SimpleCellAddress } from 'hyperformula/typings/Cell';
import { type InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import { type InterpreterValue } from 'hyperformula/typings/interpreter/InterpreterValue';
import { type ProcedureAst } from 'hyperformula/typings/parser';
import get from 'lodash.get';

import { debounce } from '@dxos/async';
import { log } from '@dxos/log';

import { type CellContentValue } from './model';

// TODO(burdon): API gateways!
// https://publicapis.io
// https://api-ninjas.com/api/cryptoprice
// https://developers.google.com/apis-explorer
// https://publicapis.io/coin-desk-api
// https://api.coindesk.com/v1/bpi/currentprice/USD.json

/**
 * The context singleton for the model is passed into custom functions.
 */
export class ModelContext {
  private readonly _cache = new Map<string, CellContentValue>();
  private readonly _pending = new Map<string, number>();
  private readonly _onUpdate: () => void;

  constructor(
    onUpdate: () => void,
    private readonly _ttl = 10_000,
  ) {
    this._onUpdate = debounce(onUpdate, 100);
  }

  getKey(address: SimpleCellAddress) {
    const { sheet, col, row } = address;
    return `${sheet}:${col}:${row}`;
  }

  // TODO(burdon): Mangle name with params.
  getInvocationKey(name: string, ...args: any) {
    return JSON.stringify({ name, ...args });
  }

  /**
   * Exec the function if TTL has expired.
   * Return the cached value.
   */
  exec(
    name: string,
    state: InterpreterState,
    args: any[],
    cb: (...args: any[]) => Promise<CellContentValue>,
    options?: FunctionOptions,
  ): InterpreterValue {
    const { formulaAddress } = state;
    const key = this.getKey(formulaAddress);
    const now = Date.now();
    const invocationKey = this.getInvocationKey(name, ...args);
    const ts = this._pending.get(invocationKey);
    if (!ts || now - ts > (options?.ttl ?? this._ttl)) {
      this._pending.set(invocationKey, now);
      setTimeout(async () => {
        try {
          log.info('function exec', { name, args });
          const value = await cb(...args);
          this._cache.set(key, value);
          this._onUpdate();
        } catch (err) {
          log.warn('function failed', { name, err });
        }
      });
    }

    return this._cache.get(key) ?? EmptyValue;
  }
}

// TODO(burdon): Async functions.
//  Implement general cache and throttled execution.
//  https://hyperformula.handsontable.com/guide/known-limitations.html#known-limitations
//  https://github.com/handsontable/hyperformula/issues/892

type FunctionOptions = {
  ttl?: number;
};

/**
 * Base class for async functions.
 */
class FunctionPluginAsync extends FunctionPlugin {
  get context() {
    return this.config.context as ModelContext;
  }

  runAsyncFunction(
    ast: ProcedureAst,
    state: InterpreterState,
    cb: (...args: any) => Promise<CellContentValue>,
    options?: FunctionOptions,
  ) {
    const { procedureName } = ast;
    const metadata = this.metadata(procedureName);
    return this.runFunction(ast.args, state, metadata, (...args: any) => {
      return this.context.exec(procedureName, state, args, cb, options);
    });
  }
}

/**
 * https://hyperformula.handsontable.com/guide/custom-functions.html#add-a-simple-custom-function
 */
// TODO(burdon): Unit test.
export class CustomPlugin extends FunctionPluginAsync {
  crypto(ast: ProcedureAst, state: InterpreterState) {
    return this.runAsyncFunction(
      ast,
      state,
      async (_currency) => {
        const currency = (_currency || 'USD').toUpperCase();
        const result = await fetch(`https://api.coindesk.com/v1/bpi/currentprice/${currency}.json`);
        const data = await result.json();
        const rate = get(data, ['bpi', currency, 'rate']);
        if (!rate) {
          return NaN;
        }

        return parseNumberString(rate);
      },
      { ttl: 10_000 },
    );
  }
}

CustomPlugin.implementedFunctions = {
  CRYPTO: {
    method: 'crypto',
    parameters: [{ argumentType: FunctionArgumentType.STRING }],
    isVolatile: true,
  },
};

export const CustomPluginTranslations = {
  enGB: {
    CRYPTO: 'CRYPTO',
  },
  enUS: {
    CRYPTO: 'CRYPTO',
  },
};

// TODO(burdon): Factor out.
const parseNumberString = (numStr: string): number => {
  return parseFloat(numStr.replace(/[^\d.]/g, ''));
};
