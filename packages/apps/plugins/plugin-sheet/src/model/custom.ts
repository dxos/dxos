//
// Copyright 2024 DXOS.org
//

import { FunctionArgumentType } from 'hyperformula';
import { type InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import { type ProcedureAst } from 'hyperformula/typings/parser';
import get from 'lodash.get';

import { type AsyncFunction, FunctionPluginAsync } from './async-function';

// TODO(burdon): Factor out.
const parseNumberString = (str: string): number => {
  return parseFloat(str.replace(/[^\d.]/g, ''));
};

/**
 * https://hyperformula.handsontable.com/guide/custom-functions.html#add-a-simple-custom-function
 */
export class CustomPlugin extends FunctionPluginAsync {
  test(ast: ProcedureAst, state: InterpreterState) {
    const handler: AsyncFunction = async () => {
      return Math.random();
    };

    return this.runAsyncFunction(ast, state, handler);
  }

  crypto(ast: ProcedureAst, state: InterpreterState) {
    const handler: AsyncFunction = async (_currency) => {
      const currency = (_currency || 'USD').toUpperCase();
      const result = await fetch(`https://api.coindesk.com/v1/bpi/currentprice/${currency}.json`);
      const data = await result.json();
      const rate = get(data, ['bpi', currency, 'rate']);
      if (!rate) {
        return NaN;
      }

      return parseNumberString(rate);
    };

    return this.runAsyncFunction(ast, state, handler, { ttl: 10_000 });
  }
}

CustomPlugin.implementedFunctions = {
  TEST: {
    method: 'test',
    parameters: [],
    isVolatile: true,
  },

  CRYPTO: {
    method: 'crypto',
    parameters: [{ argumentType: FunctionArgumentType.STRING }],
    isVolatile: true,
  },
};

export const CustomPluginTranslations = {
  enGB: {
    TEST: 'TEST',
    CRYPTO: 'CRYPTO',
  },
  enUS: {
    TEST: 'TEST',
    CRYPTO: 'CRYPTO',
  },
};
