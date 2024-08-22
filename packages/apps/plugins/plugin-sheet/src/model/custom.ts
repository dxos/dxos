//
// Copyright 2024 DXOS.org
//

import { EmptyValue, FunctionArgumentType, FunctionPlugin } from 'hyperformula';
import { type InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import { type FunctionMetadata } from 'hyperformula/typings/interpreter/plugin/FunctionPlugin';
import { type Ast, type ProcedureAst } from 'hyperformula/typings/parser';

import { type CellContentValue, type ModelContext } from './model';

// TODO(burdon): API gateways!
// https://api-ninjas.com/api/cryptoprice
// https://publicapis.io/coin-desk-api
// https://api.coindesk.com/v1/bpi/currentprice/USD.json

// TODO(burdon): Async functions.
//  Implement general cache and throttled execution.
//  https://hyperformula.handsontable.com/guide/known-limitations.html#known-limitations
//  https://github.com/handsontable/hyperformula/issues/892
class FunctionPluginAsync extends FunctionPlugin {
  private readonly _cache = new Map<string, CellContentValue>();
  private readonly _pending = new Map<string, () => Promise<CellContentValue>>();

  runAsyncFunction(
    args: Ast[],
    state: InterpreterState,
    metadata: FunctionMetadata,
    cb: (...arg: any) => Promise<CellContentValue>,
  ) {
    const { formulaAddress } = state;
    const { sheet, col, row } = formulaAddress;
    const key = `${sheet}:${col}:${row}`;

    // TODO(burdon): Schedule/throttle.
    setTimeout(async () => {
      const value = await cb(...args);
      this._cache.set(key, value);
      const context = this.interpreter.config.getConfig().context as ModelContext;
      context.setValue(formulaAddress, value);
    });

    return this.runFunction(args, state, metadata, () => this._cache.get(key) ?? EmptyValue);
  }
}

/**
 * https://hyperformula.handsontable.com/guide/custom-functions.html#add-a-simple-custom-function
 */
// TODO(burdon): Unit test.
// TODO(burdon): Input value.
export class CustomPlugin extends FunctionPluginAsync {
  crypto(ast: ProcedureAst, state: InterpreterState) {
    return this.runAsyncFunction(ast.args, state, this.metadata('CRYPTO'), async () => {
      const currency = 'USD';
      const result = await fetch(`https://api.coindesk.com/v1/bpi/currentprice/${currency}.json`);
      const data = await result.json();
      const {
        bpi: {
          [currency]: { rate },
        },
      } = data;

      const parseNumberString = (numStr: string): number => {
        const cleanedStr = numStr.replace(/,/g, '');
        return parseFloat(cleanedStr);
      };

      return parseNumberString(rate);
    });
  }
}

CustomPlugin.implementedFunctions = {
  CRYPTO: {
    method: 'crypto',
    parameters: [{ argumentType: FunctionArgumentType.STRING }],
    // isVolatile: true,
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
