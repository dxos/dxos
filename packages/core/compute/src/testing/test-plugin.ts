//
// Copyright 2024 DXOS.org
//

import { getDeep } from '@dxos/util';
import { type InterpreterState, type ProcedureAst } from '@dxos/vendor-hyperformula';
import { FunctionArgumentType } from '@dxos/vendor-hyperformula';

import { type ComputeGraphPlugin } from '../compute-graph-registry';
import { type AsyncFunction, AsyncFunctionPlugin } from '../functions';
import { parseNumberString } from '../util';

/**
 * Testing functions run locally (not run via EDGE).
 * https://hyperformula.handsontable.com/guide/custom-functions.html#add-a-simple-custom-function
 */
export class TestPlugin extends AsyncFunctionPlugin {
  /**
   * Simple local function returns input value.
   */
  test(ast: ProcedureAst, state: InterpreterState) {
    const handler: AsyncFunction = async (_value) => _value;

    return this.runAsyncFunction(ast, state, handler);
  }

  /**
   * Simple local function returns random number.
   */
  random(ast: ProcedureAst, state: InterpreterState) {
    const handler: AsyncFunction = async () => Math.random();

    return this.runAsyncFunction(ast, state, handler);
  }

  /**
   * Async HTTP function.
   */
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

TestPlugin.implementedFunctions = {
  TEST: {
    method: 'test',
    parameters: [{ argumentType: FunctionArgumentType.NUMBER, optionalArg: false }],
    isVolatile: true,
  },

  RANDOM: {
    method: 'random',
    parameters: [],
    isVolatile: true,
  },

  CRYPTO: {
    method: 'crypto',
    parameters: [{ argumentType: FunctionArgumentType.STRING, optionalArg: true }],
    isVolatile: true,
  },
};

export const TestPluginTranslations = {
  enGB: {
    TEST: 'Returns input value',
    RANDOM: 'Random number',
    CRYPTO: 'Crypto token value',
  },
  enUS: {
    TEST: 'Returns input value',
    RANDOM: 'Random number',
    CRYPTO: 'Crypto token value',
  },
};

export const testFunctionPlugins: ComputeGraphPlugin[] = [
  {
    plugin: TestPlugin,
    translations: TestPluginTranslations,
  },
];
