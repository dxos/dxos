//
// Copyright 2024 DXOS.org
//

import { type InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import { type ProcedureAst } from 'hyperformula/typings/parser';

import { getDeep } from '@dxos/util';

import { FunctionArgumentType } from '#hyperformula';
import { type AsyncFunction, FunctionPluginAsync } from './async-function';
import { parseNumberString } from './util';

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
      const rate = getDeep<string>(data, ['bpi', currency, 'rate']);
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
    parameters: [{ argumentType: FunctionArgumentType.STRING, optionalArg: true }],
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
