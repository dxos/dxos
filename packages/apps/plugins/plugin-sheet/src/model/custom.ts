//
// Copyright 2024 DXOS.org
//

import { FunctionArgumentType, FunctionPlugin } from 'hyperformula';
import { type InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import { type ProcedureAst } from 'hyperformula/typings/parser';

import { type ModelContext } from './model';

// TODO(burdon): API gateway.
// https://api-ninjas.com/api/cryptoprice
// https://publicapis.io/coin-desk-api
// https://api.coindesk.com/v1/bpi/currentprice/USD.json

/**
 * https://hyperformula.handsontable.com/guide/custom-functions.html#add-a-simple-custom-function
 */
// TODO(burdon): Unit test.
export class CustomPlugin extends FunctionPlugin {
  test(ast: ProcedureAst, state: InterpreterState) {
    const context = this.interpreter.config.getConfig().context as ModelContext;
    // TODO(burdon): Input value.
    return this.runFunction(ast.args, state, this.metadata('TEST'), (input) => {
      // TODO(burdon): Async functions.
      //  Implement general cache and throttled execution.
      //  https://hyperformula.handsontable.com/guide/known-limitations.html#known-limitations
      //  https://github.com/handsontable/hyperformula/issues/892
      setTimeout(async () => {
        // TODO(burdon): Throttle.
        const result = await fetch('https://api.coindesk.com/v1/bpi/currentprice/USD.json');
        const data = await result.json();
        const {
          bpi: {
            USD: { rate },
          },
        } = data;

        const parseNumberString = (numStr: string): number => {
          const cleanedStr = numStr.replace(/,/g, '');
          return parseFloat(cleanedStr);
        };

        const value = parseNumberString(rate);
        const { formulaAddress } = state;
        context.setValue(formulaAddress, value);
      });

      // TODO(burdon): Mark pending and don't update.
      return 0;
    });
  }
}

CustomPlugin.implementedFunctions = {
  TEST: {
    method: 'test',
    parameters: [{ argumentType: FunctionArgumentType.STRING }],
    // isVolatile: true,
  },
};

export const CustomPluginTranslations = {
  enGB: {
    TEST: 'TEST',
  },
  enUS: {
    TEST: 'TEST',
  },
};
